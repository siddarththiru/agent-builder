import React from "react";

export type Step = {
  key: string;
  label: string;
};

type Props = {
  steps: Step[];
  activeKey: string;
};

const Stepper: React.FC<Props> = ({ steps, activeKey }) => {
  return (
    <div style={{ display: "flex", gap: "12px", marginBottom: "16px" }}>
      {steps.map((step) => {
        const isActive = step.key === activeKey;
        return (
          <div
            key={step.key}
            style={{
              padding: "10px 14px",
              borderRadius: "12px",
              background: isActive ? "#B6B09F" : "#EAE4D5",
              color: "#000000",
              border: isActive ? "2px solid #B6B09F" : "1px solid #B6B09F",
              minWidth: 0,
            }}
          >
            <strong style={{ display: "block", fontSize: "13px" }}>{step.label}</strong>
          </div>
        );
      })}
    </div>
  );
};

export default Stepper;
