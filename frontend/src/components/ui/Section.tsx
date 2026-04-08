import { Heading, StackProps, VStack } from "@chakra-ui/react";
import { ReactNode } from "react";

type SectionProps = StackProps & {
  title?: string;
  children: ReactNode;
};

export const Section = ({ title, children, ...rest }: SectionProps) => {
  return (
    <VStack align="stretch" spacing={4} {...rest}>
      {title ? (
        <Heading size="sm" color="text.secondary" letterSpacing="0.01em">
          {title}
        </Heading>
      ) : null}
      {children}
    </VStack>
  );
};
