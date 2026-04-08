import { HStack, StackProps, VStack } from "@chakra-ui/react";
import { ReactNode } from "react";
import { Surface } from "../ui/Surface";

type FilterBarProps = StackProps & {
  children: ReactNode;
};

export const FilterBar = ({ children, ...rest }: FilterBarProps) => {
  return (
    <Surface p={4} {...rest}>
      <HStack spacing={3} flexWrap="wrap" align="end">
        {children}
      </HStack>
    </Surface>
  );
};
