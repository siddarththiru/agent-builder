import { Badge } from "@chakra-ui/react";
import { StatusType } from "../../types/status";

type StatusBadgeProps = {
  status: StatusType;
  label: string;
};

const statusStyles: Record<StatusType, { bg: string; color: string }> = {
  success: { bg: "rgba(79, 159, 120, 0.18)", color: "#2f7252" },
  pending: { bg: "rgba(111, 139, 191, 0.18)", color: "#3f5d8e" },
  warning: { bg: "rgba(201, 150, 72, 0.2)", color: "#8e6328" },
  danger: { bg: "rgba(180, 103, 103, 0.2)", color: "#7e3f3f" },
  info: { bg: "rgba(91, 137, 198, 0.2)", color: "#345f97" },
};

export const StatusBadge = ({ status, label }: StatusBadgeProps) => {
  const style = statusStyles[status];
  return (
    <Badge bg={style.bg} color={style.color} textTransform="none">
      {label}
    </Badge>
  );
};
