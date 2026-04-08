import { StatusBadge } from "../ui/StatusBadge";
import { titleCase } from "../../lib/format";

type SessionStatusBadgeProps = {
  status: string;
};

const toneForStatus = (status: string): "success" | "pending" | "warning" | "danger" | "info" => {
  const normalized = status.toLowerCase();
  if (["approved", "completed", "success", "succeeded"].includes(normalized)) {
    return "success";
  }
  if (["pending", "paused", "queued", "waiting"].includes(normalized)) {
    return "pending";
  }
  if (["running", "in_progress", "in-progress", "active"].includes(normalized)) {
    return "info";
  }
  if (["denied", "terminated", "failed", "rejected", "blocked"].includes(normalized)) {
    return "danger";
  }
  return "warning";
};

export const SessionStatusBadge = ({ status }: SessionStatusBadgeProps) => {
  return <StatusBadge status={toneForStatus(status)} label={titleCase(status)} />;
};
