import React, { useEffect, useMemo, useState } from "react";
import Stepper from "../components/Stepper";
import MetadataStep from "../components/steps/MetadataStep";
import ToolsStep from "../components/steps/ToolsStep";
import PolicyStep from "../components/steps/PolicyStep";
import ReviewStep from "../components/steps/ReviewStep";
import {
  Agent,
  AgentDefinition,
  AgentCreate,
  Policy,
  PolicyCreate,
  Tool,
} from "../types";
import {
  createAgent,
  getDefinition,
  getTools,
  setAgentTools,
  setPolicy,
  getAgentTools,
} from "../api/client";

const models = ["gpt-4.1-mini", "gpt-4.1", "gpt-4.1-extended"];

const steps = [
  { key: "metadata", label: "Metadata" },
  { key: "tools", label: "Tools" },
  { key: "policies", label: "Policies" },
  { key: "review", label: "Review & Export" },
];

const formCardStyle: React.CSSProperties = {
  background: "#EAE4D5",
  border: "1px solid #B6B09F",
  borderRadius: "12px",
  padding: "20px",
  boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
};

const AgentBuilderPage: React.FC = () => {
  const [activeStep, setActiveStep] = useState<string>("metadata");
  const [agent, setAgent] = useState<Agent | null>(null);
  const [agentDefinition, setAgentDefinition] = useState<AgentDefinition | null>(null);
  const [availableTools, setAvailableTools] = useState<Tool[]>([]);
  const [selectedToolIds, setSelectedToolIds] = useState<number[]>([]);
  const [policy, setPolicyState] = useState<Policy | null>(null);
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);

  const [metadataForm, setMetadataForm] = useState<AgentCreate>({
    name: "",
    description: "",
    purpose: "",
    model: models[0],
  });

  const [policyForm, setPolicyForm] = useState<PolicyCreate>({
    frequency_limit: null,
    require_approval_for_all_tool_calls: false,
  });

  const isMetadataValid = useMemo(() => {
    return (
      metadataForm.name.trim().length > 0 &&
      metadataForm.description.trim().length >= 10 &&
      metadataForm.purpose.trim().length >= 5 &&
      metadataForm.model.trim().length > 0
    );
  }, [metadataForm]);

  useEffect(() => {
    if (activeStep === "tools" && availableTools.length === 0) {
      void fetchTools();
    }
    if (activeStep === "policies" && agent) {
      void fetchSelectedTools(agent.id);
    }
    if (activeStep === "review" && agent) {
      void fetchDefinition(agent.id);
    }
  }, [activeStep, agent]);

  const fetchTools = async () => {
    setError("");
    try {
      const tools = await getTools();
      setAvailableTools(tools);
    } catch (err) {
      setError("Failed to load tools. Please try again.");
    }
  };

  const fetchSelectedTools = async (agentId: number) => {
    setError("");
    try {
      const tools = await getAgentTools(agentId);
      setSelectedToolIds(tools.map((t) => t.id));
    } catch (err) {
      setError("Failed to load selected tools.");
    }
  };

  const fetchDefinition = async (agentId: number) => {
    setError("");
    setLoading(true);
    try {
      const definition = await getDefinition(agentId);
      setAgentDefinition(definition);
    } catch (err) {
      setError("Unable to fetch agent definition. Ensure policy is configured.");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAgent = async () => {
    setError("");
    setLoading(true);
    try {
      const created = await createAgent(metadataForm);
      setAgent(created);
      setActiveStep("tools");
    } catch (err: any) {
      const message = err?.response?.data?.detail ?? "Unable to create agent. Check inputs.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveTools = async () => {
    if (!agent) {
      setError("Agent not created. Please go back to Metadata step and create the agent first.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const tools = await setAgentTools(agent.id, selectedToolIds);
      setSelectedToolIds(tools.map((t) => t.id));
      setActiveStep("policies");
    } catch (err: any) {
      const message = err?.response?.data?.detail ?? "Failed to save tools.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleSavePolicy = async () => {
    if (!agent) {
      setError("Agent not created. Please go back to Metadata step and create the agent first.");
      return;
    }
    if (policyForm.require_approval_for_all_tool_calls && selectedToolIds.length === 0) {
      setError("Agent has no tools and all tool calls require approval - this agent will be unusable.");
      return;
    }
    if (policyForm.frequency_limit !== null && policyForm.frequency_limit <= 0) {
      setError("Frequency limit must be positive when provided.");
      return;
    }

    setError("");
    setLoading(true);
    try {
      const saved = await setPolicy(agent.id, policyForm);
      setPolicyState(saved);
      setActiveStep("review");
    } catch (err: any) {
      const message = err?.response?.data?.detail ?? "Failed to save policy.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const renderMetadataStep = () => (
    <div style={formCardStyle}>
      <MetadataStep
        form={metadataForm}
        setForm={setMetadataForm}
        isValid={isMetadataValid}
        loading={loading}
        error={error}
        onSubmit={handleCreateAgent}
      />
    </div>
  );

  const renderToolsStep = () => (
    <div style={formCardStyle}>
      <ToolsStep
        availableTools={availableTools}
        selectedToolIds={selectedToolIds}
        setSelectedToolIds={setSelectedToolIds}
        loading={loading}
        error={error}
        onSubmit={handleSaveTools}
        onBack={() => setActiveStep("metadata")}
      />
    </div>
  );

  const renderPoliciesStep = () => (
    <div style={formCardStyle}>
      <PolicyStep
        selectedToolIds={selectedToolIds}
        availableTools={availableTools}
        form={policyForm}
        setForm={setPolicyForm}
        loading={loading}
        error={error}
        onSubmit={handleSavePolicy}
        onBack={() => setActiveStep("tools")}
      />
    </div>
  );

  const renderReviewStep = () => (
    <div style={formCardStyle}>
      <ReviewStep
        agentDefinition={agentDefinition}
        loading={loading}
        error={error}
        onBack={() => setActiveStep("policies")}
      />
    </div>
  );

  return (
    <div style={{ maxWidth: "960px", margin: "0 auto", padding: "24px", background: "#F2F2F2", minHeight: "100vh" }}>
      <header style={{ marginBottom: "18px" }}>
        <h1 style={{ margin: "6px 0 0", color: "#000000" }}>Secure Agent Builder</h1>
      </header>

      <Stepper steps={steps} activeKey={activeStep} />

      {activeStep === "metadata" && renderMetadataStep()}
      {activeStep === "tools" && renderToolsStep()}
      {activeStep === "policies" && renderPoliciesStep()}
      {activeStep === "review" && renderReviewStep()}
    </div>
  );
};

export default AgentBuilderPage;
