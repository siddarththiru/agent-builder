import { FeaturePlaceholderPage } from "../../components/layout/FeaturePlaceholderPage";

export const ToolsPage = () => {
  return (
    <FeaturePlaceholderPage
      title="Tools"
      description="Define tool adapters, permissions, and health checks for the execution layer."
      highlights={[
        "Tool catalog and connection status",
        "Credential scope and approval gating",
        "Pre-flight test harness",
      ]}
    />
  );
};
