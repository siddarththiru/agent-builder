import json
import logging
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional, Tuple

from sqlmodel import Session, and_, func, select

from app import models
from app.repository.log_repository import LogRepository

logger = logging.getLogger(__name__)

class ExecutionSummary:   
    def __init__(
        self,
        session_id: str,
        agent_id: int,
        analysis_window_start: datetime,
        analysis_window_end: datetime,
    ):
        self.session_id = session_id
        self.agent_id = agent_id
        self.analysis_window_start = analysis_window_start
        self.analysis_window_end = analysis_window_end
        
        # Execution metadata
        self.execution_count = 0
        self.total_duration_s = 0.0
        
        # Tool invocations
        self.tool_calls: List[Dict[str, Any]] = []
        self.tool_names_used: set = set()
        self.tool_categories: Dict[str, str] = {}
        
        # Enforcement history
        self.enforcement_decisions: Dict[str, int] = {}  # {decision: count}
        self.blocked_attempts: List[Dict[str, Any]] = []
        self.paused_attempts: List[Dict[str, Any]] = []
        
        # Success/failure patterns
        self.success_count = 0
        self.failure_count = 0
        self.error_types: Dict[str, int] = {}
        
        # Input/output characteristics
        self.input_sensitivity_flags: set = set()
        self.output_types_observed: set = set()
        self.retry_patterns: int = 0
    
    def to_mcp_context(self) -> Dict[str, Any]:
        return {
            "execution_metadata": {
                "session_id": self.session_id,
                "agent_id": self.agent_id,
                "analysis_window": {
                    "start": self.analysis_window_start.isoformat(),
                    "end": self.analysis_window_end.isoformat(),
                },
                "execution_count": self.execution_count,
                "total_duration_seconds": self.total_duration_s,
            },
            "tool_context": {
                "tools_used": sorted(list(self.tool_names_used)),
                "tool_categories": self.tool_categories,
                "total_tool_invocations": len(self.tool_calls),
            },
            "behavioral_context": {
                "enforcement_decisions": self.enforcement_decisions,
                "blocked_attempts_count": len(self.blocked_attempts),
                "paused_attempts_count": len(self.paused_attempts),
                "blocked_tool_names": sorted(
                    list(set(att["tool"] for att in self.blocked_attempts))
                ),
            },
            "outcome_context": {
                "success_rate": self.success_count / max(1, self.success_count + self.failure_count),
                "total_successes": self.success_count,
                "total_failures": self.failure_count,
                "error_types": dict(sorted(self.error_types.items(), key=lambda x: -x[1])),
            },
            "sensitivity_context": {
                "input_sensitivity_flags": sorted(list(self.input_sensitivity_flags)),
                "output_types_observed": sorted(list(self.output_types_observed)),
                "retry_patterns_detected": self.retry_patterns > 0,
                "retry_count": self.retry_patterns,
            },
        }

class LogAggregator:   
    def __init__(self, db_session: Session):
        self.db_session = db_session
        self.repo = LogRepository(db_session)
    
    def aggregate_session(
        self,
        session_id: str,
        agent_id: int,
    ) -> ExecutionSummary:
        logs = self.repo.get_session_logs(session_id, order_asc=True)
        
        # Determine time window from logs
        if not logs:
            window_start = datetime.utcnow()
            window_end = datetime.utcnow()
        else:
            window_start = min(log.timestamp for log in logs)
            window_end = max(log.timestamp for log in logs)
        
        summary = ExecutionSummary(
            session_id=session_id,
            agent_id=agent_id,
            analysis_window_start=window_start,
            analysis_window_end=window_end,
        )
        
        # Walk logs in chronological order
        for log in logs:
            event_type = log.event_type
            # Parse event_data from JSON string
            try:
                event_data = json.loads(log.event_data) if isinstance(log.event_data, str) else log.event_data
            except (json.JSONDecodeError, TypeError):
                event_data = {}
            
            if event_type == "session_start":
                summary.execution_count += 1
            
            elif event_type == "tool_call":
                tool_name = event_data.get("tool", "unknown")
                summary.tool_names_used.add(tool_name)
                params_provided = event_data.get("params_provided", False)
                
                # Record sanitized tool call
                summary.tool_calls.append({
                    "tool": tool_name,
                    "timestamp": log.timestamp.isoformat(),
                    "params_provided": params_provided,
                })
                
                # Check for sensitivity flags in tool name
                if any(x in tool_name.lower() for x in ["cred", "password", "token", "key", "secret"]):
                    summary.input_sensitivity_flags.add("credentials_possible")
                if any(x in tool_name.lower() for x in ["file", "path", "read", "write", "disk"]):
                    summary.input_sensitivity_flags.add("file_path_possible")
                if any(x in tool_name.lower() for x in ["http", "request", "network", "socket", "api"]):
                    summary.input_sensitivity_flags.add("network_target_possible")
                
                # If params were provided, assume credentials for database/config tools
                if params_provided and any(x in tool_name.lower() for x in ["database", "config", "auth", "login", "connection"]):
                    summary.input_sensitivity_flags.add("credentials_possible")
                
                # Also check parameters for sensitive keys (if present)
                params = event_data.get("params", {})
                if params:
                    params_str = str(params).lower()
                    if any(x in params_str for x in ["password", "token", "secret", "credential", "apikey", "api_key"]):
                        summary.input_sensitivity_flags.add("credentials_possible")
                    if any(x in params_str for x in ["path", "file", "directory"]):
                        summary.input_sensitivity_flags.add("file_path_possible")
            
            elif event_type == "tool_call_result":
                result_status = event_data.get("status", "unknown")
                if result_status == "success":
                    summary.success_count += 1
                else:
                    summary.failure_count += 1
                
                # Record output type
                output_type = event_data.get("output_type", "unknown")
                if output_type != "unknown":
                    summary.output_types_observed.add(output_type)
                
                # Detect retries
                if event_data.get("attempt", 1) > 1:
                    summary.retry_patterns += 1
            
            elif event_type == "enforcement_decision":
                decision = event_data.get("decision", "unknown")
                summary.enforcement_decisions[decision] = summary.enforcement_decisions.get(decision, 0) + 1
                
                # Track blocked/paused attempts
                if decision == "block":
                    summary.blocked_attempts.append({
                        "tool": event_data.get("tool_name", "unknown"),
                        "reasons": event_data.get("reasons", []),
                        "timestamp": log.timestamp.isoformat(),
                    })
                elif decision == "pause":
                    summary.paused_attempts.append({
                        "tool": event_data.get("tool_name", "unknown"),
                        "reasons": event_data.get("reasons", []),
                        "timestamp": log.timestamp.isoformat(),
                    })
            
            elif event_type == "runtime_error":
                error_type = event_data.get("error_type", "unknown_error")
                summary.error_types[error_type] = summary.error_types.get(error_type, 0) + 1
                summary.failure_count += 1
        
        # Populate tool categories from metadata
        for tool_id in range(1, 100):  # TODO: query actual tool IDs
            try:
                tool = self.db_session.get(models.Tool, tool_id)
                if tool and tool.name in summary.tool_names_used:
                    # Infer category from tool name
                    category = self._infer_tool_category(tool.name)
                    summary.tool_categories[tool.name] = category
            except Exception:
                pass
        
        return summary
    
    def aggregate_agent_recent(
        self,
        agent_id: int,
        window_hours: int = 24,
    ) -> ExecutionSummary:
        from_time = datetime.utcnow() - timedelta(hours=window_hours)
        
        # Get all logs for agent in time window
        logs, total = self.repo.get_logs(
            agent_id=agent_id,
            from_time=from_time,
            limit=10000,  # High limit for aggregation
        )
        
        summary = ExecutionSummary(
            session_id="agent_wide",
            agent_id=agent_id,
            analysis_window_start=from_time,
            analysis_window_end=datetime.utcnow(),
        )
        
        # Process logs (duplicate logic from aggregate_session)
        # In production, extract to helper method
        for log in logs:
            event_type = log.event_type
            # Parse event_data from JSON string
            try:
                event_data = json.loads(log.event_data) if isinstance(log.event_data, str) else log.event_data
            except (json.JSONDecodeError, TypeError):
                event_data = {}
            
            if event_type == "session_start":
                summary.execution_count += 1
            elif event_type == "tool_call":
                tool_name = event_data.get("tool", "unknown")
                summary.tool_names_used.add(tool_name)
                params_provided = event_data.get("params_provided", False)
                summary.tool_calls.append({
                    "tool": tool_name,
                    "timestamp": log.timestamp.isoformat(),
                })
                # Sensitivity flags check from tool name
                if any(x in tool_name.lower() for x in ["cred", "password", "token", "key", "secret"]):
                    summary.input_sensitivity_flags.add("credentials_possible")
                if any(x in tool_name.lower() for x in ["file", "path", "read", "write"]):
                    summary.input_sensitivity_flags.add("file_path_possible")
                if any(x in tool_name.lower() for x in ["http", "request", "network"]):
                    summary.input_sensitivity_flags.add("network_target_possible")
                
                # If params were provided, assume credentials for database/config tools
                if params_provided and any(x in tool_name.lower() for x in ["database", "config", "auth", "login", "connection"]):
                    summary.input_sensitivity_flags.add("credentials_possible")
                
                # Also check parameters for sensitive keys
                params = event_data.get("params", {})
                if params:
                    params_str = str(params).lower()
                    if any(x in params_str for x in ["password", "token", "secret", "credential", "apikey", "api_key"]):
                        summary.input_sensitivity_flags.add("credentials_possible")
                    if any(x in params_str for x in ["path", "file", "directory"]):
                        summary.input_sensitivity_flags.add("file_path_possible")
            elif event_type == "tool_call_result":
                status = event_data.get("status", "unknown")
                if status == "success":
                    summary.success_count += 1
                else:
                    summary.failure_count += 1
            elif event_type == "enforcement_decision":
                decision = event_data.get("decision", "unknown")
                summary.enforcement_decisions[decision] = summary.enforcement_decisions.get(decision, 0) + 1
                if decision == "block":
                    summary.blocked_attempts.append({
                        "tool": event_data.get("tool_name", "unknown"),
                        "reasons": event_data.get("reasons", []),
                    })
            elif event_type == "runtime_error":
                summary.failure_count += 1
        
        return summary
    
    @staticmethod
    def _infer_tool_category(tool_name: str) -> str:
        name_lower = tool_name.lower()
        
        if any(x in name_lower for x in ["sql", "database", "query", "db"]):
            return "database"
        elif any(x in name_lower for x in ["file", "disk", "read", "write", "path"]):
            return "filesystem"
        elif any(x in name_lower for x in ["http", "request", "api", "fetch", "post", "get"]):
            return "network"
        elif any(x in name_lower for x in ["calc", "math", "compute", "eval"]):
            return "computation"
        elif any(x in name_lower for x in ["exec", "shell", "cmd", "command", "process"]):
            return "execution"
        else:
            return "general"

class ThreatClassificationWorker:   
    POLLING_INTERVAL_MINUTES = 15
    
    def __init__(self, db_session: Session, mcp_client: Optional[Any] = None):
        self.db_session = db_session
        self.mcp_client = mcp_client
        self.aggregator = LogAggregator(db_session)
        self.repo = LogRepository(db_session)
        # Initialize to far past so first poll is allowed
        self.last_classification_time = datetime.utcnow() - \
            timedelta(minutes=self.POLLING_INTERVAL_MINUTES + 1)
    
    def should_poll(self) -> bool:
        since_last = datetime.utcnow() - self.last_classification_time
        return since_last.total_seconds() >= (self.POLLING_INTERVAL_MINUTES * 60)
    
    def find_unclassified_sessions(self) -> List[Tuple[str, int]]:
        # Find all unique (session_id, agent_id) pairs in logs
        query = select(
            models.Log.session_id,
            models.Log.agent_id,
        ).where(
            models.Log.event_type == "session_end"
        ).distinct()
        
        sessions_from_logs = self.db_session.exec(query).all()
        
        # Check which have threat_classification events
        unclassified = []
        for session_id, agent_id in sessions_from_logs:
            has_classification = self.db_session.exec(
                select(models.Log).where(
                    and_(
                        models.Log.session_id == session_id,
                        models.Log.event_type == "threat_classification",
                    )
                )
            ).first()
            
            if not has_classification:
                unclassified.append((session_id, agent_id))
        
        return unclassified
    
    def classify_session(
        self,
        session_id: str,
        agent_id: int,
    ) -> Dict[str, Any]:
        # Aggregate logs
        try:
            summary = self.aggregator.aggregate_session(session_id, agent_id)
        except Exception as e:
            logger.error(f"Failed to aggregate logs for {session_id}: {e}")
            return {
                "risk_level": "unknown",
                "intent": "unknown",
                "confidence": 0.0,
                "explanation": f"Aggregation failed: {str(e)}",
            }
        
        # Get MCP classification (no fallback)
        if not self.mcp_client:
            raise ValueError("MCP client is required for classification")

        try:
            classification = self.mcp_client.classify(summary.to_mcp_context())
        except Exception as e:
            logger.error(f"MCP classification failed: {e}")
            raise
        
        return classification
    
    
    def persist_classification(
        self,
        session_id: str,
        agent_id: int,
        classification: Dict[str, Any],
        analysis_window_start: datetime,
        analysis_window_end: datetime,
    ) -> None:
        event_data = {
            "risk_level": classification["risk_level"],
            "intent": classification["intent"],
            "confidence": classification["confidence"],
            "explanation": classification["explanation"],
            "analysis_window": {
                "start": analysis_window_start.isoformat(),
                "end": analysis_window_end.isoformat(),
            },
            "classification_timestamp": datetime.utcnow().isoformat(),
        }
        
        log_entry = models.Log(
            session_id=session_id,
            agent_id=agent_id,
            event_type="threat_classification",
            event_data=json.dumps(event_data),
            timestamp=datetime.utcnow(),
        )
        
        self.db_session.add(log_entry)
        self.db_session.commit()
        
        logger.info(
            f"Threat classification for session {session_id}: "
            f"{classification['risk_level']} / {classification['intent']} "
            f"(confidence: {classification['confidence']:.2f})"
        )
    
    def poll_and_classify(self) -> Dict[str, int]:
        stats = {"sessions_found": 0, "sessions_classified": 0, "errors": 0}
        
        if not self.should_poll():
            return stats
        
        try:
            unclassified = self.find_unclassified_sessions()
            stats["sessions_found"] = len(unclassified)
            
            for session_id, agent_id in unclassified:
                try:
                    summary = self.aggregator.aggregate_session(session_id, agent_id)
                    classification = self.classify_session(session_id, agent_id)
                    self.persist_classification(
                        session_id,
                        agent_id,
                        classification,
                        summary.analysis_window_start,
                        summary.analysis_window_end,
                    )
                    stats["sessions_classified"] += 1
                except Exception as e:
                    logger.error(f"Error classifying session {session_id}: {e}")
                    stats["errors"] += 1
            
            self.last_classification_time = datetime.utcnow()
        
        except Exception as e:
            logger.error(f"Polling error: {e}")
            stats["errors"] += 1
        
        return stats
