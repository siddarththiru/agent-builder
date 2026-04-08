import { Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "../components/layout/AppShell";
import { DashboardPage } from "../features/dashboard/DashboardPage";
import { BuilderPage } from "../features/builder/BuilderPage";
import { SessionsPage } from "../features/sessions/SessionsPage";
import { ApprovalsPage } from "../features/approvals/ApprovalsPage";
import { InvestigationPage } from "../features/investigation/InvestigationPage";
import { NotificationsPage } from "../features/notifications/NotificationsPage";
import { ToolsPage } from "../features/tools/ToolsPage";

export const AppRouter = () => {
  return (
    <Routes>
      <Route path="/" element={<AppShell />}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="builder" element={<BuilderPage />} />
        <Route path="sessions" element={<SessionsPage />} />
        <Route path="approvals" element={<ApprovalsPage />} />
        <Route path="investigation" element={<InvestigationPage />} />
        <Route path="notifications" element={<NotificationsPage />} />
        <Route path="tools" element={<ToolsPage />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Route>
    </Routes>
  );
};
