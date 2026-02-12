import json
import logging
from typing import Any, Dict

import httpx

logger = logging.getLogger(__name__)

class MCPClassificationRequest:   
    def __init__(self, context: Dict[str, Any]):
        self.context = context
    
    def to_prompt(self) -> str:
        context = self.context
        
        # Extract key information
        exec_meta = context["execution_metadata"]
        tool_ctx = context["tool_context"]
        behavioral = context["behavioral_context"]
        outcome = context["outcome_context"]
        sensitivity = context["sensitivity_context"]
        
        blocked = behavioral.get("blocked_attempts_count", 0)
        paused = behavioral.get("paused_attempts_count", 0)
        tools_used = ", ".join(tool_ctx.get("tools_used", [])) or "none"
        success_rate = outcome.get("success_rate", 0)
        
        prompt = f"""Given the following sanitized agent execution summary, classify the threat level and intent.

            EXECUTION SUMMARY:
            - Agent ID: {exec_meta['agent_id']}
            - Analysis window: {exec_meta['analysis_window']['start']} to {exec_meta['analysis_window']['end']}
            - Total executions: {exec_meta['execution_count']}

            TOOL USAGE:
            - Tools invoked: {tools_used}
            - Total invocations: {tool_ctx['total_tool_invocations']}
            - Tool categories: {json.dumps(tool_ctx['tool_categories'])}

            ENFORCEMENT HISTORY:
            - Decisions: {json.dumps(behavioral['enforcement_decisions'])}
            - Blocked attempts: {blocked}
            - Paused attempts: {paused}
            - Blocked tools: {', '.join(behavioral['blocked_tool_names']) or 'none'}

            OUTCOMES:
            - Success rate: {success_rate:.1%}
            - Total successes: {outcome['total_successes']}
            - Total failures: {outcome['total_failures']}
            - Error types: {json.dumps(outcome['error_types'])}

            SENSITIVITY FLAGS:
            - Input sensitivity flags: {', '.join(sensitivity['input_sensitivity_flags']) or 'none'}
            - Output types: {', '.join(sensitivity['output_types_observed']) or 'unknown'}
            - Retry patterns: {"Yes, {count} retries detected".format(count=sensitivity['retry_count']) if sensitivity['retry_patterns_detected'] else 'No'}

            Based on this context, provide your assessment as JSON with the following structure:
            {{
            "risk_level": "low" | "medium" | "high" | "critical",
            "intent": "benign" | "ambiguous" | "malicious",
            "confidence": <float 0.0-1.0>,
            "explanation": "<brief human-readable summary>"
            }}

            Consider:
            1. Unusual patterns (repeated blocks, failed attempts, retries)
            2. Sensitivity of tools accessed (credentials, files, network, execution)
            3. Success/failure rates and error types
            4. Whether blocked attempts suggest intent
            5. Whether behavior is consistent with benign use

            Provide ONLY valid JSON in your response."""
        
        return prompt

class MCPClassificationResponse:   
    def __init__(self, risk_level: str, intent: str, confidence: float, explanation: str):
        self.risk_level = risk_level
        self.intent = intent
        self.confidence = confidence
        self.explanation = explanation
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "risk_level": self.risk_level,
            "intent": self.intent,
            "confidence": self.confidence,
            "explanation": self.explanation,
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "MCPClassificationResponse":
        # Validate fields
        risk_levels = {"low", "medium", "high", "critical"}
        intents = {"benign", "ambiguous", "malicious"}
        
        risk_level = data.get("risk_level", "unknown").lower()
        if risk_level not in risk_levels:
            raise ValueError(f"Invalid risk_level: {risk_level}")
        
        intent = data.get("intent", "unknown").lower()
        if intent not in intents:
            raise ValueError(f"Invalid intent: {intent}")
        
        confidence = float(data.get("confidence", 0.5))
        if not (0.0 <= confidence <= 1.0):
            raise ValueError(f"Invalid confidence: {confidence}")
        
        explanation = str(data.get("explanation", ""))
        if not explanation:
            raise ValueError("Missing explanation")
        
        return cls(risk_level, intent, confidence, explanation)

class MCPClient:    
    DEFAULT_TIMEOUT = 30.0
    MAX_RETRIES = 2
    
    def __init__(
        self,
        base_url: str = "http://localhost:11434/",
        timeout: float = DEFAULT_TIMEOUT,
        retries: int = MAX_RETRIES,
    ):
        self.base_url = base_url
        self.timeout = timeout
        self.retries = retries
        self.client = httpx.Client(timeout=timeout)
    
    def classify(self, context: Dict[str, Any]) -> Dict[str, Any]:
        request = MCPClassificationRequest(context)
        prompt = request.to_prompt()
        
        payload = {
            "prompt": prompt,
            "model": "gpt-4o",  # TODO: make configurable
            "temperature": 0.1,  # Low temperature for consistency
            "max_tokens": 300,
        }
        
        for attempt in range(self.retries + 1):
            try:
                logger.debug(f"MCP classification request (attempt {attempt + 1}/{self.retries + 1})")
                
                response = self.client.post(
                    f"{self.base_url}/v1/chat/completions",
                    json=payload,
                )
                
                if response.status_code != 200:
                    logger.warning(f"MCP returned status {response.status_code}")
                    if attempt < self.retries:
                        continue
                    raise MCPClientError(f"MCP server error: {response.status_code}")
                
                # Parse response
                result = response.json()
                
                # Extract JSON from message content
                message_content = result.get("choices", [{}])[0].get("message", {}).get("content", "")
                
                # Try to extract JSON from response
                try:
                    # Look for JSON in response
                    import re
                    json_match = re.search(r'\{[^{}]*"risk_level"[^{}]*\}', message_content)
                    if json_match:
                        classification_data = json.loads(json_match.group())
                    else:
                        # Try parsing entire response
                        classification_data = json.loads(message_content)
                except (json.JSONDecodeError, AttributeError) as e:
                    logger.warning(f"Failed to parse MCP response: {message_content}")
                    if attempt < self.retries:
                        continue
                    raise MCPClientError(f"Invalid MCP response format: {e}")
                
                # Validate and convert response
                try:
                    parsed = MCPClassificationResponse.from_dict(classification_data)
                    logger.info(f"MCP classification: {parsed.risk_level}/{parsed.intent} (confidence {parsed.confidence:.2f})")
                    return parsed.to_dict()
                except ValueError as e:
                    logger.warning(f"Invalid classification values: {e}")
                    if attempt < self.retries:
                        continue
                    raise MCPClientError(f"Invalid classification: {e}")
            
            except httpx.RequestError as e:
                logger.warning(f"MCP request failed (attempt {attempt + 1}): {e}")
                if attempt < self.retries:
                    continue
                raise MCPClientError(f"MCP connection failed: {e}")
        
        raise MCPClientError("All MCP classification attempts failed")
    
    def health_check(self) -> bool:
        try:
            response = self.client.get(f"{self.base_url}/v1/models", timeout=5.0)
            return response.status_code == 200
        except Exception as e:
            logger.warning(f"MCP health check failed: {e}")
            return False
    
    def close(self):
        self.client.close()
    
    def __enter__(self):
        return self
    
    def __exit__(self, *args):
        self.close()

class MCPClientError(Exception):
    pass
