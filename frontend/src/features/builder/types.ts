export type BuilderStepKey = "metadata" | "tools" | "policy" | "safety" | "review";

export type BuilderStep = {
  key: BuilderStepKey;
  title: string;
  description: string;
};

export type AgentMetadataDraft = {
  name: string;
  description: string;
  purpose: string;
  model: string;
};

export type PolicyDraft = {
  frequencyLimit: string;
  requireApprovalForAllToolCalls: boolean;
  intentGuardEnabled: boolean;
  intentGuardModelMode: "dedicated" | "same_as_agent";
  intentGuardModel: string;
  intentGuardIncludeConversation: boolean;
  intentGuardIncludeToolArgs: boolean;
  intentGuardRiskTolerance: "lenient" | "balanced" | "strict";
  intentGuardActionLow: GuardAction;
  intentGuardActionMedium: GuardAction;
  intentGuardActionHigh: GuardAction;
  intentGuardActionCritical: GuardAction;
};

export type GuardAction =
  | "ignore"
  | "clarify"
  | "autonomous_decide"
  | "pause_for_approval"
  | "block";

export type BuilderDraft = {
  metadata: AgentMetadataDraft;
  selectedToolIds: number[];
  policy: PolicyDraft;
};

export type BuilderValidationErrors = Partial<Record<keyof AgentMetadataDraft | "tools" | "frequencyLimit" | "safety", string>>;

export type ToolOption = {
  id: number;
  name: string;
  description: string;
  usable: boolean;
};

export type CreatedAgentResult = {
  agentId: number;
  agentName: string;
};
