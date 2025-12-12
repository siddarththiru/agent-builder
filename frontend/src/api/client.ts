import axios from "axios";
import {
  Agent,
  AgentCreate,
  AgentDefinition,
  AgentQARequest,
  AgentQAResponse,
  Policy,
  PolicyCreate,
  Tool,
} from "../types";

const api = axios.create({
  baseURL: process.env.REACT_APP_API_BASE_URL || "http://localhost:8000",
  headers: { "Content-Type": "application/json" },
});

export const createAgent = async (payload: AgentCreate): Promise<Agent> => {
  const { data } = await api.post<Agent>("/agents", payload);
  return data;
};

export const getAgent = async (agentId: number): Promise<Agent> => {
  const { data } = await api.get<Agent>(`/agents/${agentId}`);
  return data;
};

export const getTools = async (): Promise<Tool[]> => {
  const { data } = await api.get<Tool[]>("/tools");
  return data;
};

export const setAgentTools = async (agentId: number, toolIds: number[]): Promise<Tool[]> => {
  const { data } = await api.post<Tool[]>(`/agents/${agentId}/tools`, { tool_ids: toolIds });
  return data;
};

export const getAgentTools = async (agentId: number): Promise<Tool[]> => {
  const { data } = await api.get<Tool[]>(`/agents/${agentId}/tools`);
  return data;
};

export const setPolicy = async (agentId: number, payload: PolicyCreate): Promise<Policy> => {
  const { data } = await api.post<Policy>(`/agents/${agentId}/policy`, payload);
  return data;
};

export const getPolicy = async (agentId: number): Promise<Policy> => {
  const { data } = await api.get<Policy>(`/agents/${agentId}/policy`);
  return data;
};

export const getDefinition = async (agentId: number): Promise<AgentDefinition> => {
  const { data } = await api.get<AgentDefinition>(`/agents/${agentId}/definition`);
  return data;
};

export const askAgent = async (agentId: number, payload: AgentQARequest): Promise<AgentQAResponse> => {
  const { data } = await api.post<AgentQAResponse>(`/agents/${agentId}/qa`, payload);
  return data;
};
