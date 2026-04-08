import { Box, BoxProps } from "@chakra-ui/react";
import { ReactNode } from "react";

type SurfaceProps = BoxProps & {
  children: ReactNode;
};

export const Surface = ({ children, ...rest }: SurfaceProps) => {
  return (
    <Box
      bg="bg.surface"
      border="1px solid"
      borderColor="border.soft"
      borderRadius="lg"
      boxShadow="card"
      p={6}
      transition="all 180ms ease"
      {...rest}
    >
      {children}
    </Box>
  );
};
