import {
  AccordionButton,
  AccordionIcon,
  AccordionItem,
  AccordionPanel,
  Box,
  Code,
  HStack,
  Text,
  VStack,
} from "@chakra-ui/react";
import { StatusType } from "../../types/status";
import { formatCompactDateTime, titleCase } from "../../lib/format";
import { StatusBadge } from "../ui/StatusBadge";

type TimelineEventProps = {
  event: {
    event_type: string;
    timestamp: string;
    metadata: Record<string, unknown>;
  };
};

const toneForEvent = (eventType: string): StatusType => {
  const normalized = eventType.toLowerCase();
  if (normalized.includes("threat") || normalized.includes("deny") || normalized.includes("block")) {
    return "warning";
  }
  if (normalized.includes("error") || normalized.includes("fail") || normalized.includes("terminate")) {
    return "danger";
  }
  if (normalized.includes("approval")) {
    return "pending";
  }
  return "info";
};

export const TimelineEvent = ({ event }: TimelineEventProps) => {
  const entries = Object.entries(event.metadata || {});
  return (
    <AccordionItem border="1px solid" borderColor="border.soft" borderRadius="md" mb={3} overflow="hidden">
      <AccordionButton px={4} py={3} _hover={{ bg: "bg.surfaceMuted" }}>
        <HStack flex={1} justify="space-between" align="start" spacing={3}>
          <VStack align="start" spacing={1}>
            <Text fontWeight="700">{titleCase(event.event_type)}</Text>
            <Text color="text.muted" fontSize="sm">
              {formatCompactDateTime(event.timestamp)}
            </Text>
          </VStack>
          <StatusBadge status={toneForEvent(event.event_type)} label={titleCase(event.event_type)} />
        </HStack>
        <AccordionIcon ml={3} />
      </AccordionButton>
      <AccordionPanel px={4} pb={4} pt={0}>
        {entries.length > 0 ? (
          <VStack align="stretch" spacing={2}>
            {entries.map(([key, value]) => (
              <HStack key={key} align="start" justify="space-between" spacing={4}>
                <Text color="text.secondary" fontSize="sm" fontWeight="600">
                  {titleCase(key)}
                </Text>
                <Box maxW="70%" textAlign="right">
                  <Code whiteSpace="pre-wrap" display="inline-block" bg="bg.surfaceMuted" p={2} borderRadius="md">
                    {typeof value === "string" ? value : JSON.stringify(value, null, 2)}
                  </Code>
                </Box>
              </HStack>
            ))}
          </VStack>
        ) : (
          <Text color="text.secondary">No additional metadata was provided for this event.</Text>
        )}
      </AccordionPanel>
    </AccordionItem>
  );
};
