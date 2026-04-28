import { BuilderDraft, BuilderValidationErrors } from "./types";

const actionRanks = {
  ignore: 0,
  clarify: 1,
  autonomous_decide: 2,
  pause_for_approval: 3,
  block: 4,
};

export const validateMetadata = (draft: BuilderDraft): BuilderValidationErrors => {
  const errors: BuilderValidationErrors = {};

  if (!draft.metadata.name.trim()) {
    errors.name = "Name is required.";
  }

  if (draft.metadata.description.trim().length < 10) {
    errors.description = "Description must be at least 10 characters.";
  }

  if (draft.metadata.purpose.trim().length < 5) {
    errors.purpose = "Purpose must be at least 5 characters.";
  }

  if (!draft.metadata.model.trim()) {
    errors.model = "Model is required.";
  }

  return errors;
};

export const validateTools = (draft: BuilderDraft): BuilderValidationErrors => {
  return {};
};

export const validatePolicy = (draft: BuilderDraft): BuilderValidationErrors => {
  const errors: BuilderValidationErrors = {};
  if (
    draft.policy.frequencyLimit.trim().length > 0 &&
    Number(draft.policy.frequencyLimit) <= 0
  ) {
    errors.frequencyLimit = "Frequency limit must be a positive number.";
  }

  return errors;
};

export const validateSafety = (draft: BuilderDraft): BuilderValidationErrors => {
  if (!draft.policy.intentGuardEnabled) {
    return {};
  }

  const ranks = [
    actionRanks[draft.policy.intentGuardActionLow],
    actionRanks[draft.policy.intentGuardActionMedium],
    actionRanks[draft.policy.intentGuardActionHigh],
    actionRanks[draft.policy.intentGuardActionCritical],
  ];

  for (let index = 1; index < ranks.length; index += 1) {
    if (ranks[index] < ranks[index - 1]) {
      return {
        safety: "Higher risk levels cannot be configured more leniently than lower risk levels.",
      };
    }
  }

  return {};
};
