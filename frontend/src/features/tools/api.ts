import { http, parseApiError } from "../../api/http";
import { ToolCreatePayload, ToolRecord, ToolValidateResponse } from "./types";

export const listTools = async (): Promise<ToolRecord[]> => {
  const response = await http.get<ToolRecord[]>("/tools");
  return response.data;
};

export const getTool = async (toolId: number): Promise<ToolRecord> => {
  const response = await http.get<ToolRecord>(`/tools/${toolId}`);
  return response.data;
};

export const validateTool = async (
  payload: ToolCreatePayload
): Promise<ToolValidateResponse> => {
  try {
    const response = await http.post<ToolValidateResponse>("/tools/validate", {
      name: payload.name,
      description: payload.description,
      input_schema: payload.inputSchema,
      output_schema: payload.outputSchema,
    });
    return response.data;
  } catch (error) {
    throw new Error(parseApiError(error, "Tool validation failed."));
  }
};

export const createTool = async (payload: ToolCreatePayload): Promise<ToolRecord> => {
  try {
    const response = await http.post<ToolRecord>("/tools", {
      name: payload.name,
      description: payload.description,
      input_schema: payload.inputSchema,
      output_schema: payload.outputSchema,
    });
    return response.data;
  } catch (error) {
    throw new Error(parseApiError(error, "Tool registration failed."));
  }
};

export const setToolUsable = async (
  toolId: number,
  usable: boolean
): Promise<ToolRecord> => {
  try {
    const response = await http.patch<ToolRecord>(`/tools/${toolId}/usable`, null, {
      params: { usable },
    });
    return response.data;
  } catch (error) {
    throw new Error(parseApiError(error, "Unable to update tool usability."));
  }
};
