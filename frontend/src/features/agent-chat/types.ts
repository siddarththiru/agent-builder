export type ChatMessage = {
  id: number;
  session_id: string;
  role: "user" | "assistant";
  content: string;
  metadata: string | null;
  created_at: string;
};

export type SessionSummary = {
  session_id: string;
  agent_id: number;
  title: string | null;
  status: string;
  created_at: string;
  updated_at: string;
};

export type SessionDetail = {
  session_id: string;
  agent_id: number;
  title: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  messages: ChatMessage[];
};

export type SessionLog = {
  id: number;
  session_id: string;
  agent_id: number;
  event_type: string;
  event_data: Record<string, unknown>;
  timestamp: string | null;
};

export type SessionLogsResponse = {
  session_id: string;
  logs: SessionLog[];
  count: number;
};
