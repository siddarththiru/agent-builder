import React from "react";
import { AgentCreate } from "../../types";

const models = ["gpt-4.1-mini", "gpt-4.1", "gpt-4.1-extended"];

const labelStyle: React.CSSProperties = { display: "block", marginBottom: "6px", fontWeight: 600, color: "#000000" };
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
const errorStyle: React.CSSProperties = {
  background: "#7f1d1d",
  color: "#fecdd3",
  padding: "10px 12px",
  borderRadius: "8px",
  border: "1px solid #b91c1c",
  marginBottom: "12px",
};

type Props = {
  form: AgentCreate;
  setForm: (form: AgentCreate) => void;
  isValid: boolean;
  loading: boolean;
  error: string;
  onSubmit: () => void;
};

const MetadataStep: React.FC<Props> = ({ form, setForm, isValid, loading, error, onSubmit }) => (
  <div>
    <h2 style={{ marginTop: 0, marginBottom: "12px" }}>Agent Metadata</h2>
    {error && <div style={errorStyle}>{error}</div>}
    <div style={{ display: "grid", gap: "12px" }}>
      <div>
        <label style={labelStyle}>Name</label>
        <input
          style={inputStyle}
          value={form.name}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, name: e.target.value })}
          placeholder="My Agent"
        />
      </div>
      <div>
        <label style={labelStyle}>Description</label>
        <textarea
          style={{ ...inputStyle, minHeight: "80px" }}
          value={form.description}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
            setForm({ ...form, description: e.target.value })
          }
          placeholder="Short description of the agent"
        />
      </div>
      <div>
        <label style={labelStyle}>Purpose</label>
        <textarea
          style={{ ...inputStyle, minHeight: "80px" }}
          value={form.purpose}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setForm({ ...form, purpose: e.target.value })}
          placeholder="What job should this agent accomplish?"
        />
      </div>
      <div>
        <label style={labelStyle}>Model</label>
        <select
          style={inputStyle}
          value={form.model}
          onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setForm({ ...form, model: e.target.value })}
        >
          {models.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
      </div>
    </div>
    <div style={{ marginTop: "16px", display: "flex", justifyContent: "flex-end", gap: "12px" }}>
      <button
        style={{ ...buttonStyle, opacity: isValid && !loading ? 1 : 0.5 }}
        disabled={!isValid || loading}
        onClick={onSubmit}
      >
        {loading ? "Saving..." : "Next: Tools"}
      </button>
    </div>
  </div>
);

export default MetadataStep;
