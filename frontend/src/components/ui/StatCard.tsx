import { HStack, Text, VStack } from "@chakra-ui/react";
import { ReactNode } from "react";
import { Surface } from "./Surface";
import { StatusBadge } from "./StatusBadge";
import { StatusType } from "../../types/status";

type StatCardProps = {
  label: string;
  value: string;
  helper: string;
  status: StatusType;
  statusLabel: string;
  icon?: ReactNode;
};

export const StatCard = ({
  label,
  value,
  helper,
  status,
  statusLabel,
  icon,
}: StatCardProps) => {
  return (
    <Surface p={5}>
      <VStack align="stretch" spacing={3}>
        <HStack justify="space-between" align="start">
          <Text color="text.secondary" fontSize="sm" fontWeight="600">
            {label}
          </Text>
          <StatusBadge status={status} label={statusLabel} />
        </HStack>
        <HStack justify="space-between" align="end">
          <VStack align="start" spacing={1}>
            <Text fontSize="3xl" lineHeight={1.1} fontWeight="700">
              {value}
            </Text>
            <Text color="text.muted" fontSize="sm">
              {helper}
            </Text>
          </VStack>
          {icon ? <Text fontSize="2xl">{icon}</Text> : null}
        </HStack>
      </VStack>
    </Surface>
  );
};
