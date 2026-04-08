export type InvestigationSessionSummary = {
  session_id: string;
  agent_id: number;
  status: string;
  created_at: string;
  last_updated: string;
};

export type InvestigationSessionListResponse = {
  sessions: InvestigationSessionSummary[];
  total: number;
  count: number;
  limit: number;
  offset: number;
};

export type InvestigationSessionDetail = {
  session_id: string;
  agent_id: number;
  status: string;
  created_at: string;
  last_updated: string;
  latest_classification?: {
    risk_level?: string | null;
    confidence?: number | null;
    timestamp?: string | null;
  } | null;
  approval?: {
    id: number;
    status: string;
    tool_name?: string | null;
    requested_at?: string | null;
    decided_at?: string | null;
    decided_by?: string | null;
  } | null;
};

export type InvestigationTimelineResponse = {
  session_id: string;
  agent_id: number;
  status: string;
  events: Array<{
    timestamp: string;
    event_type: string;
    metadata: Record<string, unknown>;
  }>;
  event_count: number;
};

export type InvestigationClassification = {
  session_id: string;
  agent_id: number;
  risk_level?: string | null;
  confidence?: number | null;
  explanation?: string | null;
  timestamp: string;
};

export type InvestigationClassificationListResponse = {
  classifications: InvestigationClassification[];
  total: number;
  count: number;
  limit: number;
  offset: number;
};

export type InvestigationApproval = {
  id: number;
  agent_id: number;
  session_id: string;
  tool_name: string;
  status: string;
  decided_by?: string | null;
  created_at: string;
  decided_at?: string | null;
};

export type InvestigationApprovalListResponse = {
  approvals: InvestigationApproval[];
  total: number;
  count: number;
  limit: number;
  offset: number;
};

export type AgentActivity = {
  agent_id: number;
  agent_name: string;
  recent_sessions: InvestigationSessionSummary[];
  total_sessions: number;
  tool_usage_counts: Record<string, number>;
  block_count: number;
  approval_count: number;
  risk_classifications: Array<{
    session_id: string;
    risk_level: string;
    timestamp: string;
  }>;
  limit: number;
  offset: number;
};
