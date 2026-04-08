import { Alert, AlertIcon, Button, Text, VStack } from "@chakra-ui/react";
import { Surface } from "../ui/Surface";

type ErrorPanelProps = {
  title?: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
};

export const ErrorPanel = ({ title = "Something went wrong", message, actionLabel, onAction }: ErrorPanelProps) => {
  return (
    <Surface>
      <VStack align="stretch" spacing={3}>
        <Alert status="error" borderRadius="md">
          <AlertIcon />
          <Text fontWeight="600">{title}</Text>
        </Alert>
        <Text color="text.secondary">{message}</Text>
        {actionLabel && onAction ? (
          <Button alignSelf="start" onClick={onAction} variant="outline">
            {actionLabel}
          </Button>
        ) : null}
      </VStack>
    </Surface>
  );
};
