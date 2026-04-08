import { HStack, ListItem, Text, UnorderedList, VStack } from "@chakra-ui/react";
import { EmptyState } from "../ui/EmptyState";
import { PageHeader } from "../ui/PageHeader";
import { Section } from "../ui/Section";
import { Surface } from "../ui/Surface";
import { Button } from "../ui/Button";

type FeaturePlaceholderPageProps = {
  title: string;
  description: string;
  highlights: string[];
};

export const FeaturePlaceholderPage = ({
  title,
  description,
  highlights,
}: FeaturePlaceholderPageProps) => {
  return (
    <VStack align="stretch" spacing={7}>
      <PageHeader
        title={title}
        description={description}
        actions={<Button variant="outline">Roadmap</Button>}
      />

      <Section title="Phase 1 status">
        <Surface>
          <VStack align="stretch" spacing={4}>
            <Text color="text.secondary">
              This area is scaffolded and ready for detailed workflows in Phase 2.
            </Text>
            <UnorderedList ml={5} color="text.secondary" spacing={2}>
              {highlights.map((item) => (
                <ListItem key={item}>{item}</ListItem>
              ))}
            </UnorderedList>
            <HStack>
              <Button size="sm">Define requirements</Button>
              <Button size="sm" variant="ghost">
                Review UI contract
              </Button>
            </HStack>
          </VStack>
        </Surface>
      </Section>

      <Section>
        <EmptyState
          title="No configured workflows yet"
          description="Use this prepared layout to add business logic, data hooks, and validation rules in the next phase."
        />
      </Section>
    </VStack>
  );
};
