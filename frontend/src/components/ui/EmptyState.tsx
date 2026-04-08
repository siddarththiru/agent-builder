import { Text, VStack } from "@chakra-ui/react";
import { ReactNode } from "react";
import { Surface } from "./Surface";

type EmptyStateProps = {
  title: string;
  description: string;
  action?: ReactNode;
};

export const EmptyState = ({ title, description, action }: EmptyStateProps) => {
  return (
    <Surface bg="bg.surfaceMuted" borderStyle="dashed">
      <VStack align="start" spacing={3}>
        <Text fontWeight="700">{title}</Text>
        <Text color="text.secondary">{description}</Text>
        {action}
      </VStack>
    </Surface>
  );
};
