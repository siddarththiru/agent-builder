import { listApprovals } from "../approvals/api";
import {
  listInvestigationClassifications,
  listInvestigationSessions,
} from "../investigation/api";
import { getLogs } from "../reporting/api";
import { NotificationAlert, NotificationCenterData } from "./types";

const toTimestamp = (value?: string): number => {
  if (!value) {
    return 0;
  }
  const parsed = new Date(value).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
};

const createCounts = (alerts: NotificationAlert[]) => ({
  total: alerts.length,
  danger: alerts.filter((alert) => alert.severity === "danger").length,
  warning: alerts.filter((alert) => alert.severity === "warning").length,
  pending: alerts.filter((alert) => alert.severity === "pending").length,
});

export const getNotificationCenterData = async (): Promise<NotificationCenterData> => {
  const [pendingApprovals, classifications, runtimeErrors, blockedDecisions, terminatedSessions] =
    await Promise.all([
      listApprovals({ statusFilter: "pending", limit: 25 }),
      listInvestigationClassifications({ limit: 40, offset: 0 }),
      getLogs({ eventType: "runtime_error", limit: 25, offset: 0 }),
      getLogs({ eventType: "enforcement_decision", limit: 50, offset: 0 }),
      listInvestigationSessions({ status: "terminated", limit: 20, offset: 0 }),
    ]);

  const alerts: NotificationAlert[] = [];

  pendingApprovals.approvals.forEach((approval) => {
    alerts.push({
      id: `approval-${approval.session_id}`,
      title: "Approval required",
      description: `${approval.tool_name} is awaiting operator decision.`,
      type: "Approval",
      severity: "pending",
      timestamp: approval.requested_at,
      sessionId: approval.session_id,
      agentId: approval.agent_id,
      route: `/approvals?sessionId=${approval.session_id}`,
      source: "approval",
    });
  });

  classifications.classifications
    .filter((row) => {
      const risk = (row.risk_level || "").toLowerCase();
      return risk === "high" || risk === "critical";
    })
    .forEach((row, index) => {
      alerts.push({
        id: `classification-${row.session_id}-${index}`,
        title: "High-risk classification",
        description: row.explanation || "Investigation model reported elevated risk.",
        type: "Classification",
        severity: (row.risk_level || "").toLowerCase() === "critical" ? "danger" : "warning",
        timestamp: row.timestamp,
        sessionId: row.session_id,
        agentId: row.agent_id,
        route: `/investigation?sessionId=${row.session_id}`,
        source: "classification",
      });
    });

  runtimeErrors.logs.forEach((log) => {
    alerts.push({
      id: `runtime-error-${log.id}`,
      title: "Runtime error detected",
      description: "A runtime error event was recorded for this session.",
      type: "Runtime error",
      severity: "danger",
      timestamp: log.timestamp,
      sessionId: log.session_id,
      agentId: log.agent_id,
      route: `/investigation?sessionId=${log.session_id}`,
      source: "runtime_error",
    });
  });

  blockedDecisions.logs
    .filter((log) => {
      const decision = String((log.event_data || {}).decision || "").toLowerCase();
      return decision === "block";
    })
    .forEach((log) => {
      alerts.push({
        id: `blocked-${log.id}`,
        title: "Enforcement blocked an action",
        description: "A policy enforcement decision blocked a tool call or transition.",
        type: "Policy block",
        severity: "warning",
        timestamp: log.timestamp,
        sessionId: log.session_id,
        agentId: log.agent_id,
        route: `/investigation?sessionId=${log.session_id}`,
        source: "blocked",
      });
    });

  terminatedSessions.sessions.forEach((session) => {
    alerts.push({
      id: `terminated-${session.session_id}`,
      title: "Session terminated",
      description: `Session ${session.session_id} ended with status ${session.status}.`,
      type: "Session status",
      severity: "info",
      timestamp: session.last_updated,
      sessionId: session.session_id,
      agentId: session.agent_id,
      route: `/sessions?sessionId=${session.session_id}`,
      source: "session_status",
    });
  });

  const sortedAlerts = alerts.sort(
    (a, b) => toTimestamp(b.timestamp) - toTimestamp(a.timestamp)
  );

  return {
    alerts: sortedAlerts,
    counts: createCounts(sortedAlerts),
  };
};

