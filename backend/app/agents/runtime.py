import uuid
from typing import Dict

from langchain_core.language_models.chat_models import BaseChatModel
from langchain_core.messages import AIMessage, HumanMessage, SystemMessage, ToolMessage
from langgraph.graph import END, StateGraph
from sqlmodel import Session

from app.agents.event_logger import EventLogger
from app.agents.interception import InterceptionHook
from app.agents.runtime_state import RuntimeState
from app.agents.tool_adapter import ToolAdapter
from app.schemas import AgentDefinition, AgentDefinitionTool


class AgentRuntime:    
    def __init__(
        self,
        agent_definition: AgentDefinition,
        chat_model: BaseChatModel,
        db_session: Session
    ):
        self.agent_def = agent_definition
        self.chat_model = chat_model
        self.db_session = db_session
        self.logger = EventLogger(db_session)
        
        self.tools_dict: Dict[str, AgentDefinitionTool] = {
            tool.name: tool for tool in agent_definition.tools
        }
        
        self.system_prompt = self._build_system_prompt()
    
    def _build_system_prompt(self) -> str:
        prompt_parts = [
            f"You are {self.agent_def.name}.",
            f"Purpose: {self.agent_def.purpose}",
            f"Description: {self.agent_def.description}",
            "\nAvailable tools:"
        ]
        
        for tool in self.agent_def.tools:
            prompt_parts.append(f"- {tool.name}: {tool.description}")
        
        prompt_parts.append("\nFollow these rules:")
        prompt_parts.append("- Use tools when needed to answer questions")
        prompt_parts.append("- Provide clear, concise answers")
        prompt_parts.append("- If you cannot answer, explain why")
        
        return "\n".join(prompt_parts)
    
    def execute(self, user_input: str) -> Dict:
        # Generate session ID
        session_id = str(uuid.uuid4())
        
        # Log session start
        self.logger.log_session_start(
            session_id=session_id,
            agent_id=self.agent_def.agent_id,
            user_input=user_input
        )
        
        # Initialize runtime components
        tool_adapter = ToolAdapter(self.tools_dict)
        interception_hook = InterceptionHook(
            session_id=session_id,
            agent_id=self.agent_def.agent_id,
            logger=self.logger,
            allowed_tool_ids=[tool.id for tool in self.agent_def.tools],
            frequency_limit=self.agent_def.policy.frequency_limit,
            require_approval_for_all=self.agent_def.policy.require_approval_for_all_tool_calls
        )
        
        # Build and execute graph
        graph = self._build_graph(tool_adapter, interception_hook, session_id)
        
        # Initialize state
        initial_state: RuntimeState = {
            "session_id": session_id,
            "agent_id": self.agent_def.agent_id,
            "messages": [
                SystemMessage(content=self.system_prompt),
                HumanMessage(content=user_input)
            ],
            "pending_tool_call": None,
            "execution_status": "running",
            "final_output": None,
            "error": None
        }
        
        try:
            # Execute graph
            final_state = graph.invoke(initial_state)
            
            # Log session end
            self.logger.log_session_end(
                session_id=session_id,
                agent_id=self.agent_def.agent_id,
                status=final_state["execution_status"],
                final_output=final_state.get("final_output"),
                error=final_state.get("error")
            )
            
            return {
                "session_id": session_id,
                "status": final_state["execution_status"],
                "final_output": final_state.get("final_output"),
                "error": final_state.get("error")
            }
        
        except Exception as e:
            # Log failure
            self.logger.log_session_end(
                session_id=session_id,
                agent_id=self.agent_def.agent_id,
                status="failed",
                error=str(e)
            )
            
            return {
                "session_id": session_id,
                "status": "failed",
                "final_output": None,
                "error": str(e)
            }
    
    def _build_graph(
        self,
        tool_adapter: ToolAdapter,
        interception_hook: InterceptionHook,
        session_id: str
    ) -> StateGraph:
        graph = StateGraph(RuntimeState)
        
        # Add nodes
        graph.add_node("reason", lambda state: self._reason_node(state))
        graph.add_node("decide_action", lambda state: self._decide_action_node(state))
        graph.add_node(
            "invoke_tool",
            lambda state: self._invoke_tool_node(state, tool_adapter, interception_hook)
        )
        
        # Define edges
        graph.set_entry_point("reason")
        graph.add_edge("reason", "decide_action")
        
        # Conditional routing from decide_action
        graph.add_conditional_edges(
            "decide_action",
            lambda state: self._route_decision(state),
            {
                "tool": "invoke_tool",
                "end": END
            }
        )
        
        # Tool execution loops back to reasoning
        graph.add_edge("invoke_tool", "reason")
        
        return graph.compile()
    
    def _reason_node(self, state: RuntimeState) -> RuntimeState:
        self.logger.log_node_transition(
            session_id=state["session_id"],
            agent_id=state["agent_id"],
            from_node="previous",
            to_node="reason"
        )
        
        try:
            response = self.chat_model.invoke(state["messages"])
            messages = list(state["messages"])
            messages.append(response)
            
            return {**state, "messages": messages}
        
        except Exception as e:
            return {
                **state,
                "execution_status": "failed",
                "error": f"Reasoning error: {str(e)}"
            }
    
    def _decide_action_node(self, state: RuntimeState) -> RuntimeState:
        self.logger.log_node_transition(
            session_id=state["session_id"],
            agent_id=state["agent_id"],
            from_node="reason",
            to_node="decide_action"
        )
        
        messages = state["messages"]
        if not messages:
            return {**state, "execution_status": "failed", "error": "No messages"}
        
        last_message = messages[-1]
        
        # Check if LLM wants to call a tool
        if isinstance(last_message, AIMessage) and hasattr(last_message, "tool_calls"):
            tool_calls = getattr(last_message, "tool_calls", [])
            if tool_calls:
                # Store first tool call as pending
                return {**state, "pending_tool_call": tool_calls[0]}
        
        # No tool call - extract final answer
        if isinstance(last_message, AIMessage):
            content = getattr(last_message, "content", "")
            return {
                **state,
                "execution_status": "completed",
                "final_output": content
            }
        
        return {**state, "execution_status": "completed", "final_output": "No response"}
    
    def _invoke_tool_node(
        self,
        state: RuntimeState,
        tool_adapter: ToolAdapter,
        interception_hook: InterceptionHook
    ) -> RuntimeState:
        self.logger.log_node_transition(
            session_id=state["session_id"],
            agent_id=state["agent_id"],
            from_node="decide_action",
            to_node="invoke_tool"
        )
        
        pending_call = state.get("pending_tool_call")
        if not pending_call:
            return {
                **state,
                "execution_status": "failed",
                "error": "No pending tool call"
            }
        
        tool_name = pending_call.get("name", "unknown")
        tool_params = pending_call.get("args", {})
        
        try:
            # Execute through adapter (includes interception)
            result = tool_adapter.invoke_tool(
                tool_name=tool_name,
                params=tool_params,
                interception_hook=lambda tn, tp: interception_hook.intercept(tn, tp)
            )
            
            # Log result
            self.logger.log_tool_result(
                session_id=state["session_id"],
                agent_id=state["agent_id"],
                tool_name=tool_name,
                result=result.get("result", result.get("error")),
                duration_ms=result.get("duration_ms", 0)
            )
            
            # Check if execution was blocked
            if result.get("blocked"):
                return {
                    **state,
                    "execution_status": "terminated",
                    "error": result.get("error", "Tool execution was blocked by policy"),
                    "pending_tool_call": None
                }
            
            # Check if execution was paused (approval required)
            if result.get("paused"):
                return {
                    **state,
                    "execution_status": "paused",
                    "error": result.get("error", "Tool execution paused - awaiting approval"),
                    "pending_tool_call": None
                }
            
            # Successful execution - append tool result to messages
            if result.get("success"):
                messages = list(state["messages"])
                messages.append(
                    ToolMessage(
                        content=str(result),
                        tool_call_id=pending_call.get("id", "unknown")
                    )
                )
                
                return {
                    **state,
                    "messages": messages,
                    "pending_tool_call": None
                }
            else:
                # Tool failed
                return {
                    **state,
                    "execution_status": "failed",
                    "error": result.get("error", "Tool execution failed"),
                    "pending_tool_call": None
                }
        
        except Exception as e:
            return {
                **state,
                "execution_status": "failed",
                "error": f"Tool execution error: {str(e)}"
            }
    
    def _route_decision(self, state: RuntimeState) -> str:
        if state.get("pending_tool_call"):
            return "tool"
        return "end"
