import { HStack, Spinner, Text } from "@chakra-ui/react";
import { Surface } from "../ui/Surface";

type LoadingPanelProps = {
  label?: string;
};

export const LoadingPanel = ({ label = "Loading..." }: LoadingPanelProps) => {
  return (
    <Surface>
      <HStack py={4} justify="center">
        <Spinner color="brand.500" />
        <Text color="text.secondary">{label}</Text>
      </HStack>
    </Surface>
  );
};
