import React, { useCallback, useMemo, useState } from "react";
import { AgentDefinition } from "../../types";
import { askAgent } from "../../api/client";

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

const ReviewStep: React.FC<Props> = ({ agentDefinition, loading, error, onBack }) => {
  const agentId = agentDefinition?.agent_id ?? null;
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [qaError, setQaError] = useState<string | null>(null);
  const [qaLoading, setQaLoading] = useState(false);

  const canAsk = useMemo(() => !!agentId && question.trim().length > 0 && !qaLoading, [agentId, question, qaLoading]);

  const onAsk = useCallback(async () => {
    if (!agentId) return;
    setQaError(null);
    setAnswer(null);
    setQaLoading(true);
    try {
      const res = await askAgent(agentId, { question });
      setAnswer(res.answer ?? "");
    } catch (e: any) {
      const msg = e?.response?.data?.detail || e?.message || "Failed to get an answer";
      setQaError(String(msg));
    } finally {
      setQaLoading(false);
    }
  }, [agentId, question]);

  return (
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

          <div style={{ marginTop: "18px", paddingTop: "12px", borderTop: "1px dashed #B6B09F" }}>
            <h3 style={{ marginTop: 0, marginBottom: "8px", color: "#000000" }}>Test this agent</h3>
            {qaError && <div style={errorStyle}>{qaError}</div>}
            <textarea
              value={question}
              onChange={(e) => {
                setQuestion(e.target.value);
                setAnswer(null);
                setQaError(null);
              }}
              placeholder="Ask your agent anything…"
              rows={4}
              style={{
                width: "100%",
                padding: "10px",
                borderRadius: "8px",
                border: "1px solid #B6B09F",
                background: "#FFFFFF",
                color: "#000000",
                resize: "vertical",
              }}
              disabled={!agentId}
            />
            <div style={{ marginTop: "10px", display: "flex", gap: "10px", alignItems: "center" }}>
              <button style={buttonStyle} onClick={onAsk} disabled={!canAsk}>
                {qaLoading ? "Asking…" : "Ask"}
              </button>
              {!agentId && <span style={{ color: "#B6B09F" }}>Agent not ready yet.</span>}
            </div>
            <div style={{ marginTop: "12px" }}>
              <label style={{ display: "block", marginBottom: "6px", color: "#000000", fontWeight: 600 }}>
                Answer
              </label>
              <div
                style={{
                  minHeight: "60px",
                  background: "#F2F2F2",
                  color: "#000000",
                  padding: "12px",
                  borderRadius: "8px",
                  border: "1px solid #B6B09F",
                  whiteSpace: "pre-wrap",
                }}
              >
                {answer ?? (qaLoading ? "" : "")}
              </div>
            </div>
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
};

export default ReviewStep;
