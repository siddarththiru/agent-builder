import { Box, HStack, Text, VStack } from "@chakra-ui/react";
import { useLocation, useNavigate } from "react-router-dom";
import { navItems } from "../../lib/routes";
import { NavItem } from "../ui/NavItem";

export const AppSidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <Box
      as="aside"
      w={{ base: "88px", lg: "292px" }}
      flexShrink={0}
      borderRight="1px solid"
      borderColor="border.soft"
      bg="bg.panel"
      px={{ base: 2, lg: 4 }}
      py={5}
      position="sticky"
      top={0}
      h="100vh"
      overflowY="auto"
    >
      <VStack align="stretch" spacing={4}>
        <Box px={{ base: 1, lg: 2 }} pb={3}>
          <Text fontWeight="800" fontSize={{ base: "md", lg: "xl" }} letterSpacing="-0.02em">
            AF
          </Text>
          <Text display={{ base: "none", lg: "block" }} color="text.muted" fontSize="xs" mt={1}>
            AgentFlow Control
          </Text>
        </Box>

        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Box key={item.path}>
              <NavItem
                label={item.label}
                description={item.description}
                isActive={isActive}
                onClick={() => navigate(item.path)}
                icon={
                  <HStack spacing={1} display={{ base: "none", lg: "flex" }}>
                    <Box w="7px" h="7px" borderRadius="full" bg={isActive ? "brand.500" : "slate.300"} />
                    <Box
                      w="7px"
                      h="7px"
                      borderRadius="full"
                      bg={isActive ? "brand.300" : "slate.200"}
                    />
                  </HStack>
                }
              />
            </Box>
          );
        })}
      </VStack>
    </Box>
  );
};
