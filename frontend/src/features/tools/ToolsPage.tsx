import {
  Alert,
  AlertIcon,
  Grid,
  GridItem,
  HStack,
  Input,
  Select,
  Switch,
  Text,
  Textarea,
  VStack,
  useToast,
} from "@chakra-ui/react";
import { useEffect, useMemo, useState } from "react";
import { DataTable } from "../../components/operations/DataTable";
import { DetailCard } from "../../components/operations/DetailCard";
import { EmptyPanel } from "../../components/operations/EmptyPanel";
import { ErrorPanel } from "../../components/operations/ErrorPanel";
import { FilterBar } from "../../components/operations/FilterBar";
import { JsonPreviewPanel } from "../../components/operations/JsonPreviewPanel";
import { LoadingPanel } from "../../components/operations/LoadingPanel";
import { MetadataList } from "../../components/operations/MetadataList";
import { ToolHealthBadge } from "../../components/operations/ToolHealthBadge";
import { ToolSchemaEditor } from "../../components/operations/ToolSchemaEditor";
import { Button } from "../../components/ui/Button";
import { PageHeader } from "../../components/ui/PageHeader";
import { createTool, getTool, listTools, setToolUsable, validateTool } from "./api";
import { ToolCreatePayload, ToolRecord, ToolValidateResponse } from "./types";

const defaultInputSchema = JSON.stringify(
  {
    type: "object",
    properties: {
      query: {
        type: "string",
        description: "Input query for the tool",
      },
    },
    required: ["query"],
  },
  null,
  2
);

const defaultOutputSchema = JSON.stringify(
  {
    type: "object",
    properties: {
      result: {
        type: "string",
      },
    },
    required: ["result"],
  },
  null,
  2
);

export const ToolsPage = () => {
  const toast = useToast();

  const [tools, setTools] = useState<ToolRecord[]>([]);
  const [selectedToolId, setSelectedToolId] = useState<number | null>(null);
  const [selectedToolDetail, setSelectedToolDetail] = useState<ToolRecord | null>(null);

  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [usableFilter, setUsableFilter] = useState("");

  const [registerForm, setRegisterForm] = useState({
    name: "",
    description: "",
    inputSchema: defaultInputSchema,
    outputSchema: defaultOutputSchema,
  });
  const [validationResult, setValidationResult] = useState<ToolValidateResponse | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isToggling, setIsToggling] = useState(false);

  const loadTools = async () => {
    setListLoading(true);
    setListError(null);
    try {
      const response = await listTools();
      setTools(response);
      if (response.length > 0 && selectedToolId === null) {
        setSelectedToolId(response[0].id);
      }
    } catch (error) {
      setListError(error instanceof Error ? error.message : "Unable to load tools.");
    } finally {
      setListLoading(false);
    }
  };

  useEffect(() => {
    void loadTools();
  }, []);

  useEffect(() => {
    if (selectedToolId === null) {
      setSelectedToolDetail(null);
      setDetailError(null);
      return;
    }

    const loadToolDetail = async () => {
      setDetailLoading(true);
      setDetailError(null);
      try {
        const detail = await getTool(selectedToolId);
        setSelectedToolDetail(detail);
      } catch (error) {
        setDetailError(error instanceof Error ? error.message : "Unable to load tool detail.");
        setSelectedToolDetail(null);
      } finally {
        setDetailLoading(false);
      }
    };

    void loadToolDetail();
  }, [selectedToolId]);

  const filteredTools = useMemo(
    () =>
      tools.filter((tool) => {
        const searchOk =
          search.trim().length === 0 ||
          tool.name.toLowerCase().includes(search.trim().toLowerCase()) ||
          tool.description.toLowerCase().includes(search.trim().toLowerCase());

        const usableOk =
          usableFilter === ""
            ? true
            : usableFilter === "usable"
            ? tool.usable
            : !tool.usable;

        return searchOk && usableOk;
      }),
    [tools, search, usableFilter]
  );

  const toggleToolState = async (usable: boolean) => {
    if (!selectedToolDetail) {
      return;
    }

    setIsToggling(true);
    try {
      const updated = await setToolUsable(selectedToolDetail.id, usable);
      setSelectedToolDetail(updated);
      setTools((previous) =>
        previous.map((tool) => (tool.id === updated.id ? updated : tool))
      );
      toast({
        title: "Tool state updated",
        description: `${updated.name} is now ${updated.usable ? "usable" : "disabled"}.`,
        status: "success",
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      toast({
        title: "Update failed",
        description:
          error instanceof Error ? error.message : "Unable to update tool usability.",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsToggling(false);
    }
  };

  const runValidation = async () => {
    setValidationError(null);
    setIsValidating(true);
    setValidationResult(null);

    if (!registerForm.name.trim() || !registerForm.description.trim()) {
      setValidationError("Name and description are required.");
      setIsValidating(false);
      return;
    }

    try {
      const result = await validateTool({
        name: registerForm.name.trim(),
        description: registerForm.description.trim(),
        inputSchema: registerForm.inputSchema,
        outputSchema: registerForm.outputSchema,
      });
      setValidationResult(result);
      if (!result.valid && result.errors.length > 0) {
        setValidationError(result.errors.join(" | "));
      }
    } catch (error) {
      setValidationError(error instanceof Error ? error.message : "Validation failed.");
    } finally {
      setIsValidating(false);
    }
  };

  const submitRegistration = async () => {
    setIsCreating(true);
    setValidationError(null);
    try {
      const payload: ToolCreatePayload = {
        name: registerForm.name.trim(),
        description: registerForm.description.trim(),
        inputSchema: registerForm.inputSchema,
        outputSchema: registerForm.outputSchema,
      };
      const created = await createTool(payload);
      toast({
        title: "Tool registered",
        description: `${created.name} was created successfully.`,
        status: "success",
        duration: 4000,
        isClosable: true,
      });
      await loadTools();
      setSelectedToolId(created.id);
    } catch (error) {
      setValidationError(error instanceof Error ? error.message : "Tool registration failed.");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <VStack align="stretch" spacing={7}>
      <PageHeader
        title="Tools"
        description="Manage tool catalog health, validate schemas, and register new adapters for controlled runtime usage."
        actions={
          <Button variant="outline" onClick={() => void loadTools()}>
            Refresh tools
          </Button>
        }
      />

      <FilterBar>
        <VStack align="start" spacing={1} minW="220px">
          <Text fontSize="sm" fontWeight="700" color="text.secondary">
            Search
          </Text>
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by name or description"
          />
        </VStack>
        <VStack align="start" spacing={1} minW="180px">
          <Text fontSize="sm" fontWeight="700" color="text.secondary">
            Usability
          </Text>
          <Select value={usableFilter} onChange={(event) => setUsableFilter(event.target.value)}>
            <option value="">All</option>
            <option value="usable">Usable</option>
            <option value="disabled">Disabled</option>
          </Select>
        </VStack>
        <Button
          variant="ghost"
          onClick={() => {
            setSearch("");
            setUsableFilter("");
          }}
        >
          Clear
        </Button>
      </FilterBar>

      <Grid templateColumns={{ base: "1fr", xl: "1.1fr 0.9fr" }} gap={5} alignItems="start">
        <GridItem>
          <VStack align="stretch" spacing={4}>
            {listLoading ? <LoadingPanel label="Loading tools..." /> : null}
            {listError ? (
              <ErrorPanel message={listError} actionLabel="Retry" onAction={() => void loadTools()} />
            ) : null}
            {!listLoading && filteredTools.length === 0 ? (
              <EmptyPanel
                title="No tools match current filters"
                description="Change search or usability filters to inspect the full catalog."
              />
            ) : null}
            {!listLoading ? (
              <DataTable
                rows={filteredTools}
                rowKey={(tool) => String(tool.id)}
                onRowClick={(tool) => setSelectedToolId(tool.id)}
                columns={[
                  {
                    key: "name",
                    header: "Tool",
                    render: (tool) => (
                      <VStack align="start" spacing={1}>
                        <Text fontWeight="700">{tool.name}</Text>
                        <Text color="text.secondary" fontSize="sm">
                          {tool.description}
                        </Text>
                      </VStack>
                    ),
                  },
                  {
                    key: "status",
                    header: "Status",
                    render: (tool) => <ToolHealthBadge usable={tool.usable} />,
                  },
                ]}
              />
            ) : null}
          </VStack>
        </GridItem>

        <GridItem>
          <VStack
            align="stretch"
            spacing={4}
            position={{ base: "static", xl: "sticky" }}
            top={{ base: "auto", xl: "92px" }}
          >
            <DetailCard title="Tool details" subtitle="Inspect and update selected tool health state">
              {detailLoading ? <LoadingPanel label="Loading tool detail..." /> : null}
              {detailError ? <ErrorPanel message={detailError} /> : null}
              {selectedToolDetail ? (
                <VStack align="stretch" spacing={4}>
                  <MetadataList
                    items={[
                      { label: "Tool ID", value: String(selectedToolDetail.id) },
                      { label: "Name", value: selectedToolDetail.name },
                      { label: "Description", value: selectedToolDetail.description },
                    ]}
                  />
                  <HStack justify="space-between" align="center">
                    <ToolHealthBadge usable={selectedToolDetail.usable} />
                    <HStack>
                      <Text color="text.secondary" fontSize="sm">
                        Usable
                      </Text>
                      <Switch
                        colorScheme="brand"
                        isChecked={selectedToolDetail.usable}
                        onChange={(event) => void toggleToolState(event.target.checked)}
                        isDisabled={isToggling}
                      />
                    </HStack>
                  </HStack>
                  <Textarea
                    value={selectedToolDetail.input_schema}
                    readOnly
                    minH="120px"
                    fontSize="sm"
                    fontFamily="mono"
                  />
                  <Textarea
                    value={selectedToolDetail.output_schema}
                    readOnly
                    minH="120px"
                    fontSize="sm"
                    fontFamily="mono"
                  />
                </VStack>
              ) : !detailLoading ? (
                <Text color="text.secondary">Select a tool to inspect its details.</Text>
              ) : null}
            </DetailCard>
          </VStack>
        </GridItem>
      </Grid>

      <DetailCard title="Register tool" subtitle="Validate input/output schemas before creating a new tool">
        <VStack align="stretch" spacing={4}>
          <Grid templateColumns={{ base: "1fr", md: "1fr 1fr" }} gap={4}>
            <GridItem>
              <VStack align="stretch" spacing={1}>
                <Text fontSize="sm" fontWeight="700" color="text.secondary">
                  Name
                </Text>
                <Input
                  value={registerForm.name}
                  onChange={(event) =>
                    setRegisterForm((prev) => ({ ...prev, name: event.target.value }))
                  }
                  placeholder="e.g. SlackNotifier"
                />
              </VStack>
            </GridItem>
            <GridItem>
              <VStack align="stretch" spacing={1}>
                <Text fontSize="sm" fontWeight="700" color="text.secondary">
                  Description
                </Text>
                <Input
                  value={registerForm.description}
                  onChange={(event) =>
                    setRegisterForm((prev) => ({ ...prev, description: event.target.value }))
                  }
                  placeholder="Describe what this tool does"
                />
              </VStack>
            </GridItem>
          </Grid>

          <Grid templateColumns={{ base: "1fr", xl: "1fr 1fr" }} gap={4}>
            <GridItem>
              <ToolSchemaEditor
                label="Input schema"
                value={registerForm.inputSchema}
                onChange={(value) =>
                  setRegisterForm((prev) => ({ ...prev, inputSchema: value }))
                }
                helperText="Provide a JSON schema string for input payloads."
              />
            </GridItem>
            <GridItem>
              <ToolSchemaEditor
                label="Output schema"
                value={registerForm.outputSchema}
                onChange={(value) =>
                  setRegisterForm((prev) => ({ ...prev, outputSchema: value }))
                }
                helperText="Provide a JSON schema string for output payloads."
              />
            </GridItem>
          </Grid>

          {validationError ? (
            <Alert status="error" borderRadius="md">
              <AlertIcon />
              <Text>{validationError}</Text>
            </Alert>
          ) : null}

          <HStack spacing={3}>
            <Button onClick={() => void runValidation()} isLoading={isValidating} variant="outline">
              Validate schemas
            </Button>
            <Button
              onClick={() => void submitRegistration()}
              isLoading={isCreating}
              isDisabled={validationResult?.valid === false}
            >
              Register tool
            </Button>
          </HStack>

          {validationResult ? (
            <VStack align="stretch" spacing={3}>
              <ToolHealthBadge usable={validationResult.valid} />
              {validationResult.errors.length > 0 ? (
                <Alert status="warning" borderRadius="md">
                  <AlertIcon />
                  <Text>{validationResult.errors.join(" | ")}</Text>
                </Alert>
              ) : null}
              <Grid templateColumns={{ base: "1fr", xl: "1fr 1fr" }} gap={4}>
                <GridItem>
                  <JsonPreviewPanel
                    title="Validated input schema"
                    data={validationResult.input_schema}
                  />
                </GridItem>
                <GridItem>
                  <JsonPreviewPanel
                    title="Validated output schema"
                    data={validationResult.output_schema}
                  />
                </GridItem>
              </Grid>
            </VStack>
          ) : null}
        </VStack>
      </DetailCard>
    </VStack>
  );
};
