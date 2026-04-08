import { http } from "../../api/http";
import {
  AgentActivity,
  InvestigationApprovalListResponse,
  InvestigationClassificationListResponse,
  InvestigationSessionDetail,
  InvestigationSessionListResponse,
  InvestigationTimelineResponse,
} from "./types";

type InvestigationSessionQuery = {
  agentId?: string;
  status?: string;
  limit?: number;
  offset?: number;
};

export const listInvestigationSessions = async (
  query: InvestigationSessionQuery
): Promise<InvestigationSessionListResponse> => {
  const response = await http.get<InvestigationSessionListResponse>("/investigation/sessions", {
    params: {
      agent_id: query.agentId ? Number(query.agentId) : undefined,
      status: query.status || undefined,
      limit: query.limit ?? 10,
      offset: query.offset ?? 0,
    },
  });
  return response.data;
};

export const getInvestigationSession = async (
  sessionId: string
): Promise<InvestigationSessionDetail> => {
  const response = await http.get<InvestigationSessionDetail>(`/investigation/sessions/${sessionId}`);
  return response.data;
};

export const getInvestigationTimeline = async (
  sessionId: string
): Promise<InvestigationTimelineResponse> => {
  const response = await http.get<InvestigationTimelineResponse>(`/investigation/sessions/${sessionId}/events`);
  return response.data;
};

export const listInvestigationClassifications = async (
  query: { agentId?: string; sessionId?: string; riskLevel?: string; limit?: number; offset?: number }
): Promise<InvestigationClassificationListResponse> => {
  const response = await http.get<InvestigationClassificationListResponse>("/investigation/classifications", {
    params: {
      agent_id: query.agentId ? Number(query.agentId) : undefined,
      session_id: query.sessionId || undefined,
      risk_level: query.riskLevel || undefined,
      limit: query.limit ?? 20,
      offset: query.offset ?? 0,
    },
  });
  return response.data;
};

export const listInvestigationApprovals = async (
  query: { agentId?: string; sessionId?: string; status?: string; limit?: number; offset?: number }
): Promise<InvestigationApprovalListResponse> => {
  const response = await http.get<InvestigationApprovalListResponse>("/investigation/approvals", {
    params: {
      agent_id: query.agentId ? Number(query.agentId) : undefined,
      session_id: query.sessionId || undefined,
      status: query.status || undefined,
      limit: query.limit ?? 20,
      offset: query.offset ?? 0,
    },
  });
  return response.data;
};

export const getAgentActivity = async (agentId: string): Promise<AgentActivity> => {
  const response = await http.get<AgentActivity>(`/investigation/agents/${agentId}/activity`, {
    params: { limit: 10, offset: 0 },
  });
  return response.data;
};
