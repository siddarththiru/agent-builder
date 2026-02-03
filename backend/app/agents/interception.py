from typing import Any, Dict

from app.agents.event_logger import EventLogger

class InterceptionHook:
    def __init__(self, session_id: str, agent_id: int, logger: EventLogger):

        self.session_id = session_id
        self.agent_id = agent_id
        self.logger = logger
    
    def intercept(self, tool_name: str, params: Dict[str, Any]) -> str:
        # Log the interception event
        self.logger.log_tool_call(
            session_id=self.session_id,
            agent_id=self.agent_id,
            tool_name=tool_name,
            tool_params=params,
            interception_result="allowed"
        )
        
        # TODO: Add future interception logic:
        # - Check policy constraints (frequency limits)
        # - Check if approval required
        # - Query threat classification (if available)
        # - Return "blocked" or "requires_approval" if needed
        
        # For now, always allow
        return "allowed"
