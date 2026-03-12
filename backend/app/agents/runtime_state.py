from typing import List, Optional, TypedDict

from langchain_core.messages import BaseMessage

class RuntimeState(TypedDict):
    session_id: str
    agent_id: int
    messages: List[BaseMessage]
    pending_tool_call: Optional[dict]
    pending_tool_decision: Optional[str]
    execution_status: str
    final_output: Optional[str]
    error: Optional[str]
