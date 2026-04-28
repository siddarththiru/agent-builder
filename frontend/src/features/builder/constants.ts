import { BuilderStep } from "./types";

export const builderSteps: BuilderStep[] = [
  {
    key: "metadata",
    title: "Metadata",
    description: "Define identity and model behavior.",
  },
  {
    key: "tools",
    title: "Tools",
    description: "Choose allowed integrations.",
  },
  {
    key: "policy",
    title: "Policy",
    description: "Apply frequency and approval controls.",
  },
  {
    key: "safety",
    title: "Safety",
    description: "Configure live intent guard behavior.",
  },
  {
    key: "review",
    title: "Review & Export",
    description: "Validate and publish final definition.",
  },
];

export const modelOptions = [
  "gemini-2.5-flash",
  "gemini-2.5-pro",
  "gemini-1.5-flash",
  "gemini-1.5-pro",
];

export const guardActionOptions = [
  { value: "ignore", label: "Ignore" },
  { value: "clarify", label: "Ask clarification" },
  { value: "autonomous_decide", label: "Let agent decide" },
  { value: "pause_for_approval", label: "Require approval" },
  { value: "block", label: "Block" },
] as const;

export const safetyPresets = {
  lenient: {
    intentGuardRiskTolerance: "lenient",
    intentGuardActionLow: "ignore",
    intentGuardActionMedium: "ignore",
    intentGuardActionHigh: "clarify",
    intentGuardActionCritical: "pause_for_approval",
  },
  balanced: {
    intentGuardRiskTolerance: "balanced",
    intentGuardActionLow: "ignore",
    intentGuardActionMedium: "clarify",
    intentGuardActionHigh: "pause_for_approval",
    intentGuardActionCritical: "block",
  },
  secure: {
    intentGuardRiskTolerance: "strict",
    intentGuardActionLow: "ignore",
    intentGuardActionMedium: "pause_for_approval",
    intentGuardActionHigh: "block",
    intentGuardActionCritical: "block",
  },
} as const;
