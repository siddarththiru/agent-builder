import { Button, Text, VStack } from "@chakra-ui/react";
import { ReactNode } from "react";
import { Surface } from "../ui/Surface";

type EmptyPanelProps = {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryAction?: ReactNode;
};

export const EmptyPanel = ({
  title,
  description,
  actionLabel,
  onAction,
  secondaryAction,
}: EmptyPanelProps) => {
  return (
    <Surface bg="bg.surfaceMuted" borderStyle="dashed">
      <VStack align="start" spacing={3}>
        <Text fontWeight="700">{title}</Text>
        <Text color="text.secondary">{description}</Text>
        {actionLabel && onAction ? <Button onClick={onAction}>{actionLabel}</Button> : null}
        {secondaryAction}
      </VStack>
    </Surface>
  );
};
