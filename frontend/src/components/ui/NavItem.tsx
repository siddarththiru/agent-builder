import { Box, HStack, Text } from "@chakra-ui/react";
import { ReactNode } from "react";

type NavItemProps = {
  label: string;
  description: string;
  isActive: boolean;
  onClick: () => void;
  icon?: ReactNode;
};

export const NavItem = ({
  label,
  description,
  isActive,
  onClick,
  icon,
}: NavItemProps) => {
  return (
    <Box
      as="button"
      w="100%"
      textAlign="left"
      p={3}
      borderRadius="md"
      border="1px solid"
      borderColor={isActive ? "brand.300" : "transparent"}
      bg={isActive ? "rgba(140, 169, 255, 0.16)" : "transparent"}
      transition="all 180ms ease"
      _hover={{ bg: isActive ? "rgba(140, 169, 255, 0.2)" : "bg.surfaceMuted" }}
      onClick={onClick}
    >
      <HStack justify="space-between" align="start" spacing={3}>
        <Box>
          <Text fontWeight="700" fontSize="sm">
            {label}
          </Text>
          <Text color="text.muted" fontSize="xs" mt={1}>
            {description}
          </Text>
        </Box>
        {icon ? <Box pt={0.5}>{icon}</Box> : null}
      </HStack>
    </Box>
  );
};
