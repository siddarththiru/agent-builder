export type AgentPolicySummary = {
  frequency_limit: number | null;
  require_approval_for_all_tool_calls: boolean;
  intent_guard_enabled: boolean;
  intent_guard_action_medium: string;
  intent_guard_action_high: string;
  intent_guard_action_critical: string;
};

export type AgentSummary = {
  id: number;
  name: string;
  description: string;
  model: string;
  created_at: string;
  updated_at: string;
  sessions_count: number;
  tools_count: number;
  pending_approvals: number;
  latest_session_status: string | null;
  health_status: "healthy" | "attention" | "risk";
  latest_risk_level: string | null;
  policy: AgentPolicySummary | null;
};

export type AgentMetadata = {
  id: number;
  name: string;
  description: string;
  purpose: string;
  model: string;
  created_at: string;
  updated_at: string;
};

export type AgentPolicy = {
  id: number;
  agent_id: number;
  frequency_limit: number | null;
  require_approval_for_all_tool_calls: boolean;
  intent_guard_enabled: boolean;
  intent_guard_model_mode: "dedicated" | "same_as_agent";
  intent_guard_model: string | null;
  intent_guard_include_conversation: boolean;
  intent_guard_include_tool_args: boolean;
  intent_guard_risk_tolerance: "lenient" | "balanced" | "strict";
  intent_guard_action_low: any;
  intent_guard_action_medium: any;
  intent_guard_action_high: any;
  intent_guard_action_critical: any;
};

export type AgentTool = {
  id: number;
  name: string;
  description: string;
  input_schema: string;
  output_schema: string;
  usable: boolean;
};

export type AgentDefinition = {
  agent_id: number;
  name: string;
  description: string;
  purpose: string;
  model: string;
  tools: Array<{
    id: number;
    name: string;
    description: string;
    input_schema: Record<string, unknown>;
    output_schema: Record<string, unknown>;
  }>;
  policy: {
    allowed_tool_ids: number[];
    frequency_limit: number | null;
    require_approval_for_all_tool_calls: boolean;
    intent_guard_enabled: boolean;
    intent_guard_model_mode: "dedicated" | "same_as_agent";
    intent_guard_model: string | null;
    intent_guard_include_conversation: boolean;
    intent_guard_include_tool_args: boolean;
    intent_guard_risk_tolerance: "lenient" | "balanced" | "strict";
    intent_guard_action_low: any;
    intent_guard_action_medium: any;
    intent_guard_action_high: any;
    intent_guard_action_critical: any;
  };
};

export type AgentRecentSession = {
  session_id: string;
  status: string;
  created_at: string;
  updated_at: string;
  latest_risk_level: string | null;
};

export type AgentRecentApproval = {
  id: number;
  session_id: string;
  tool_name: string;
  status: string;
  requested_at: string;
  decided_at: string | null;
  decided_by: string | null;
  decision_reason: string | null;
  risk_level: string | null;
};

export type AgentLatestClassification = {
  session_id: string;
  risk_level: string | null;
  confidence: number | null;
  explanation: string | null;
  timestamp: string;
};

export type AgentProfile = {
  agent: AgentMetadata;
  policy: AgentPolicy | null;
  tools: AgentTool[];
  definition: AgentDefinition | null;
  health_status: "healthy" | "attention" | "risk";
  sessions_count: number;
  pending_approvals: number;
  recent_sessions: AgentRecentSession[];
  recent_approvals: AgentRecentApproval[];
  latest_classifications: AgentLatestClassification[];
};

export type AgentMutableMetadata = {
  name: string;
  description: string;
  purpose: string;
  model: string;
};

export type AgentMutablePolicy = {
  frequencyLimit: string;
  requireApprovalForAllToolCalls: boolean;
  intentGuardEnabled: boolean;
  intentGuardModelMode: "dedicated" | "same_as_agent";
  intentGuardModel: string;
  intentGuardIncludeConversation: boolean;
  intentGuardIncludeToolArgs: boolean;
  intentGuardRiskTolerance: "lenient" | "balanced" | "strict";
  intentGuardActionLow: any;
  intentGuardActionMedium: any;
  intentGuardActionHigh: any;
  intentGuardActionCritical: any;
};
