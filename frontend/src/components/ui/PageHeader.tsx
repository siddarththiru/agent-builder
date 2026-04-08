import { HStack, Heading, Text, VStack } from "@chakra-ui/react";
import { ReactNode } from "react";

type PageHeaderProps = {
  title: string;
  description: string;
  actions?: ReactNode;
};

export const PageHeader = ({ title, description, actions }: PageHeaderProps) => {
  return (
    <HStack justify="space-between" align="start" spacing={4} flexWrap="wrap">
      <VStack align="start" spacing={1}>
        <Heading size="lg" letterSpacing="-0.02em">
          {title}
        </Heading>
        <Text color="text.secondary" maxW="720px">
          {description}
        </Text>
      </VStack>
      {actions}
    </HStack>
  );
};
