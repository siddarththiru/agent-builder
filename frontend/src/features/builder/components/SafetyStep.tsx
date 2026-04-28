import {
  Alert,
  AlertIcon,
  Badge,
  Grid,
  GridItem,
  HStack,
  Select,
  Switch,
  Text,
  VStack,
} from "@chakra-ui/react";
import { FormSection } from "../../../components/ui/FormSection";
import { InfoField } from "../../../components/ui/InfoField";
import { Button } from "../../../components/ui/Button";
import { guardActionOptions, safetyPresets } from "../constants";
import { BuilderValidationErrors, GuardAction, PolicyDraft } from "../types";

type SafetySettingsSectionProps = {
  policy: PolicyDraft;
  errors?: BuilderValidationErrors;
  onPolicyChange: <K extends keyof PolicyDraft>(key: K, value: PolicyDraft[K]) => void;
};

type SafetyStepProps = {
  policy: PolicyDraft;
  errors: BuilderValidationErrors;
  onPolicyChange: <K extends keyof PolicyDraft>(key: K, value: PolicyDraft[K]) => void;
};

const actionRank: Record<GuardAction, number> = {
  ignore: 0,
  clarify: 1,
  autonomous_decide: 2,
  pause_for_approval: 3,
  block: 4,
};

const actionLabel = (value: GuardAction) =>
  guardActionOptions.find((option) => option.value === value)?.label || value;

const getWarnings = (policy: PolicyDraft) => {
  const warnings: string[] = [];
  if (!policy.intentGuardEnabled) {
    warnings.push("The live safety classifier is disabled for this agent.");
  }
  if (policy.intentGuardActionLow !== "ignore") {
    warnings.push("Low risk requests may interrupt normal benign conversations, including greetings.");
  }
  if (policy.intentGuardActionCritical !== "block") {
    warnings.push("Critical risk requests are not configured to block automatically.");
  }
  if (policy.intentGuardActionHigh === "ignore" || policy.intentGuardActionHigh === "clarify") {
    warnings.push("High risk requests may continue without an approval checkpoint.");
  }
  if (policy.intentGuardModelMode === "same_as_agent") {
    warnings.push("The guard will use the same model as the agent rather than a dedicated classifier.");
  }
  if (policy.intentGuardIncludeToolArgs) {
    warnings.push("Tool arguments will be sent to the guard model for tool-level checks.");
  }
  return warnings;
};

export const SafetySettingsSection = ({
  policy,
  errors,
  onPolicyChange,
}: SafetySettingsSectionProps) => {
  const warnings = getWarnings(policy);
  const ranks = [
    policy.intentGuardActionLow,
    policy.intentGuardActionMedium,
    policy.intentGuardActionHigh,
    policy.intentGuardActionCritical,
  ].map((action) => actionRank[action]);
  const orderInvalid = ranks.some((rank, index) => index > 0 && rank < ranks[index - 1]);

  const applyPreset = (presetName: keyof typeof safetyPresets) => {
    const preset = safetyPresets[presetName];
    Object.entries(preset).forEach(([key, value]) => {
      onPolicyChange(key as keyof PolicyDraft, value as any);
    });
  };

  const renderActionSelect = (
    label: string,
    key: keyof Pick<
      PolicyDraft,
      | "intentGuardActionLow"
      | "intentGuardActionMedium"
      | "intentGuardActionHigh"
      | "intentGuardActionCritical"
    >
  ) => (
    <GridItem>
      <InfoField label={label}>
        <Select
          value={policy[key]}
          onChange={(event) => onPolicyChange(key, event.target.value as GuardAction)}
        >
          {guardActionOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
      </InfoField>
    </GridItem>
  );

  return (
    <VStack align="stretch" spacing={4}>
      <FormSection
        title="Safety"
        description="Configure real-time intent checks before the agent reasons and before tools execute."
      >
        <VStack align="stretch" spacing={4}>
          <HStack justify="space-between" align="center">
            <VStack align="start" spacing={1}>
              <Text fontWeight="600">Enable intent guard</Text>
              <Text color="text.secondary" fontSize="sm">
                Classifies malicious intent, unsafe tool use, prompt injection, and policy risk.
              </Text>
            </VStack>
            <Switch
              isChecked={policy.intentGuardEnabled}
              onChange={(event) => onPolicyChange("intentGuardEnabled", event.target.checked)}
              colorScheme="brand"
              size="lg"
            />
          </HStack>

          <HStack spacing={2} flexWrap="wrap">
            <Badge colorScheme="green">Preset</Badge>
            <Button size="sm" variant="outline" onClick={() => applyPreset("secure")}>
              Secure
            </Button>
            <Button size="sm" variant="outline" onClick={() => applyPreset("balanced")}>
              Balanced
            </Button>
            <Button size="sm" variant="outline" onClick={() => applyPreset("lenient")}>
              Lenient
            </Button>
          </HStack>

          <Grid templateColumns={{ base: "1fr", md: "1fr 1fr" }} gap={4}>
            <GridItem>
              <InfoField label="Guard model mode">
                <Select
                  value={policy.intentGuardModelMode}
                  onChange={(event) =>
                    onPolicyChange("intentGuardModelMode", event.target.value as PolicyDraft["intentGuardModelMode"])
                  }
                >
                  <option value="dedicated">Dedicated classifier</option>
                  <option value="same_as_agent">Same as agent</option>
                </Select>
              </InfoField>
            </GridItem>
            <GridItem>
              <InfoField label="Guard model">
                <Select
                  value={policy.intentGuardModel}
                  onChange={(event) => onPolicyChange("intentGuardModel", event.target.value)}
                  isDisabled={policy.intentGuardModelMode === "same_as_agent"}
                >
                  <option value="gemini-2.5-flash">gemini-2.5-flash</option>
                  <option value="gemini-2.5-pro">gemini-2.5-pro</option>
                </Select>
              </InfoField>
            </GridItem>
          </Grid>

          <Grid templateColumns={{ base: "1fr", md: "1fr 1fr" }} gap={4}>
            {renderActionSelect("Low risk", "intentGuardActionLow")}
            {renderActionSelect("Medium risk", "intentGuardActionMedium")}
            {renderActionSelect("High risk", "intentGuardActionHigh")}
            {renderActionSelect("Critical risk", "intentGuardActionCritical")}
          </Grid>

          <Grid templateColumns={{ base: "1fr", md: "1fr 1fr" }} gap={4}>
            <HStack justify="space-between" border="1px solid" borderColor="border.soft" borderRadius="md" p={3}>
              <Text fontWeight="600">Include conversation</Text>
              <Switch
                isChecked={policy.intentGuardIncludeConversation}
                onChange={(event) =>
                  onPolicyChange("intentGuardIncludeConversation", event.target.checked)
                }
                colorScheme="brand"
              />
            </HStack>
            <HStack justify="space-between" border="1px solid" borderColor="border.soft" borderRadius="md" p={3}>
              <Text fontWeight="600">Include tool args</Text>
              <Switch
                isChecked={policy.intentGuardIncludeToolArgs}
                onChange={(event) =>
                  onPolicyChange("intentGuardIncludeToolArgs", event.target.checked)
                }
                colorScheme="brand"
              />
            </HStack>
          </Grid>

          <Text color="text.secondary" fontSize="sm">
            Current ladder: {actionLabel(policy.intentGuardActionLow)} /{" "}
            {actionLabel(policy.intentGuardActionMedium)} / {actionLabel(policy.intentGuardActionHigh)} /{" "}
            {actionLabel(policy.intentGuardActionCritical)}
          </Text>

          {orderInvalid || errors?.safety ? (
            <Alert status="error" borderRadius="md">
              <AlertIcon />
              <Text>{errors?.safety || "Higher risk levels must be at least as strict as lower risk levels."}</Text>
            </Alert>
          ) : null}

          {warnings.map((warning) => (
            <Alert key={warning} status="warning" borderRadius="md">
              <AlertIcon />
              <Text>{warning}</Text>
            </Alert>
          ))}
        </VStack>
      </FormSection>
    </VStack>
  );
};

export const SafetyStep = ({ policy, errors, onPolicyChange }: SafetyStepProps) => (
  <SafetySettingsSection policy={policy} errors={errors} onPolicyChange={onPolicyChange} />
);
