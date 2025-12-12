import React from "react";
import { Tool } from "../../types";

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: "8px",
  border: "1px solid #B6B09F",
  background: "#F2F2F2",
  color: "#000000",
};
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
  availableTools: Tool[];
  selectedToolIds: number[];
  setSelectedToolIds: (ids: number[]) => void;
  loading: boolean;
  error: string;
  onSubmit: () => void;
  onBack: () => void;
};

const ToolsStep: React.FC<Props> = ({
  availableTools,
  selectedToolIds,
  setSelectedToolIds,
  loading,
  error,
  onSubmit,
  onBack,
}) => (
  <div>
    <h2 style={{ marginTop: 0, marginBottom: "12px", color: "#000000" }}>Tool Selection</h2>
    {error && <div style={errorStyle}>{error}</div>}
    {availableTools.length === 0 && (
      <p style={{ color: "#B6B09F" }}>No tools available. Seed data might be missing.</p>
    )}
    <div style={{ display: "grid", gap: "10px" }}>
      {availableTools.map((tool) => {
        const checked = selectedToolIds.includes(tool.id);
        return (
          <label
            key={tool.id}
            style={{
              display: "block",
              padding: "12px",
              borderRadius: "10px",
              border: checked ? "2px solid #B6B09F" : "1px solid #B6B09F",
              background: checked ? "#B6B09F" : "#F2F2F2",
              cursor: "pointer",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <input
                type="checkbox"
                checked={checked}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  if (e.target.checked) {
                    setSelectedToolIds([...selectedToolIds, tool.id]);
                  } else {
                    setSelectedToolIds(selectedToolIds.filter((id) => id !== tool.id));
                  }
                }}
              />
              <div>
                <strong style={{ color: "#000000" }}>{tool.name}</strong>
                <p style={{ margin: "4px 0", color: "#000000" }}>{tool.description}</p>
              </div>
            </div>
          </label>
        );
      })}
    </div>
    {selectedToolIds.length === 0 && (
      <p style={{ marginTop: "10px", color: "#fbbf24" }}>
        No tools selected. This agent will have limited capabilities.
      </p>
    )}
    <div style={{ marginTop: "16px", display: "flex", justifyContent: "space-between", gap: "12px" }}>
      <button style={ghostButton} onClick={onBack} disabled={loading}>
        Back
      </button>
      <button style={buttonStyle} onClick={onSubmit} disabled={loading}>
        {loading ? "Saving..." : "Next: Policies"}
      </button>
    </div>
  </div>
);

export default ToolsStep;
