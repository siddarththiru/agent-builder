import { AlertFeedItem } from "../../components/operations/AlertFeed";

export type NotificationAlertType =
  | "approval"
  | "classification"
  | "runtime_error"
  | "blocked"
  | "session_status";

export type NotificationSeverity =
  | "success"
  | "pending"
  | "warning"
  | "danger"
  | "info";

export type NotificationAlert = AlertFeedItem & {
  source: NotificationAlertType;
};

export type NotificationCenterData = {
  alerts: NotificationAlert[];
  counts: {
    total: number;
    danger: number;
    warning: number;
    pending: number;
  };
};
