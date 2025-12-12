import React from "react";
import { AgentDefinition } from "../../types";

const buttonStyle: React.CSSProperties = {
  padding: "10px 14px",
  borderRadius: "10px",
  border: "1px solid #B6B09F",
  background: "#B6B09F",
  color: "#000000",
  cursor: "pointer",
  fontWeight: 600,
};
const ghostButton: React.CSSProperties = {
  ...buttonStyle,
  background: "transparent",
  color: "#000000",
};
const errorStyle: React.CSSProperties = {
  background: "#7f1d1d",
  color: "#fecdd3",
  padding: "10px 12px",
  borderRadius: "8px",
  border: "1px solid #b91c1c",
  marginBottom: "12px",
};

type Props = {
  agentDefinition: AgentDefinition | null;
  loading: boolean;
  error: string;
  onBack: () => void;
};

const ReviewStep: React.FC<Props> = ({ agentDefinition, loading, error, onBack }) => (
  <div>
    <h2 style={{ marginTop: 0, marginBottom: "12px", color: "#000000" }}>Review & Export</h2>
    {error && <div style={errorStyle}>{error}</div>}
    {loading && <p style={{ color: "#B6B09F" }}>Loading definition...</p>}
    {agentDefinition && (
      <div>
        <pre
          style={{
            background: "#F2F2F2",
            color: "#000000",
            padding: "14px",
            borderRadius: "10px",
            border: "1px solid #B6B09F",
            maxHeight: "360px",
            overflow: "auto",
          }}
        >
          {JSON.stringify(agentDefinition, null, 2)}
        </pre>
        <div style={{ marginTop: "12px", display: "flex", gap: "10px" }}>
          <button
            style={buttonStyle}
            onClick={() => {
              navigator.clipboard.writeText(JSON.stringify(agentDefinition, null, 2)).catch(() => {
              });
            }}
          >
            Copy JSON
          </button>
          <button
            style={ghostButton}
            onClick={() => {
              const blob = new Blob([JSON.stringify(agentDefinition, null, 2)], { type: "application/json" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = `agent_${agentDefinition.agent_id}.json`;
              a.click();
              URL.revokeObjectURL(url);
            }}
          >
            Download JSON
          </button>
        </div>
      </div>
    )}
    <div style={{ marginTop: "16px", display: "flex", justifyContent: "space-between", gap: "12px" }}>
      <button style={ghostButton} onClick={onBack} disabled={loading}>
        Back
      </button>
      <button
        style={{ ...buttonStyle, background: "#16a34a" }}
        disabled={!agentDefinition}
      >
        Done
      </button>
    </div>
  </div>
);

export default ReviewStep;
