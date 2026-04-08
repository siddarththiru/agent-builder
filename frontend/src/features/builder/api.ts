import { http, parseApiError } from "../../api/http";
import { mockTools } from "./data/mockTools";
import { BuilderDraft, CreatedAgentResult, ToolOption } from "./types";

type ApiTool = {
  id: number;
  name: string;
  description: string;
  usable: boolean;
};

type CreateAgentRequest = {
  name: string;
  description: string;
  purpose: string;
  model: string;
};

type CreateAgentResponse = {
  id: number;
  name: string;
};

export const getTools = async (): Promise<ToolOption[]> => {
  try {
    const response = await http.get<ApiTool[]>("/tools");
    return response.data.map((tool) => ({
      id: tool.id,
      name: tool.name,
      description: tool.description,
      usable: tool.usable,
    }));
  } catch {
    return mockTools;
  }
};

export const createAgentFromDraft = async (
  draft: BuilderDraft
): Promise<CreatedAgentResult> => {
  const payload: CreateAgentRequest = {
    name: draft.metadata.name.trim(),
    description: draft.metadata.description.trim(),
    purpose: draft.metadata.purpose.trim(),
    model: draft.metadata.model,
  };

  try {
    const createResponse = await http.post<CreateAgentResponse>("/agents", payload);
    const agentId = createResponse.data.id;

    await http.post(`/agents/${agentId}/tools`, {
      tool_ids: draft.selectedToolIds,
    });

    await http.post(`/agents/${agentId}/policy`, {
      frequency_limit:
        draft.policy.frequencyLimit.trim().length > 0
          ? Number(draft.policy.frequencyLimit)
          : null,
      require_approval_for_all_tool_calls:
        draft.policy.requireApprovalForAllToolCalls,
    });

    return {
      agentId,
      agentName: createResponse.data.name,
    };
  } catch (error) {
    const message = parseApiError(error, "Unable to create agent. Please try again.");
    throw new Error(message);
  }
};
