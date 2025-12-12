export type Agent = {
  id: number;
  name: string;
  description: string;
  purpose: string;
  model: string;
  created_at: string;
  updated_at: string;
};

export type AgentCreate = {
  name: string;
  description: string;
  purpose: string;
  model: string;
};

export type AgentUpdate = Partial<AgentCreate>;

export type Tool = {
  id: number;
  name: string;
  description: string;
  input_schema: string;
  output_schema: string;
};

export type Policy = {
  id: number;
  agent_id: number;
  frequency_limit: number | null;
  require_approval_for_all_tool_calls: boolean;
};

export type PolicyCreate = {
  frequency_limit: number | null;
  require_approval_for_all_tool_calls: boolean;
};

export type AgentDefinitionTool = {
  id: number;
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
  output_schema: Record<string, unknown>;
};

export type AgentDefinitionPolicy = {
  allowed_tool_ids: number[];
  frequency_limit: number | null;
  require_approval_for_all_tool_calls: boolean;
};

export type AgentDefinition = {
  agent_id: number;
  name: string;
  description: string;
  purpose: string;
  model: string;
  tools: AgentDefinitionTool[];
  policy: AgentDefinitionPolicy;
};

export type AgentQARequest = {
  question: string;
  session_id?: string;
};

export type AgentQAResponse = {
  question: string;
  answer: string;
  session_id?: string | null;
};
