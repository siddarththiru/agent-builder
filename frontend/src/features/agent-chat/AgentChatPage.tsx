import {
  Box,
  Button,
  Flex,
  HStack,
  Input,
  VStack,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  useToast,
  Textarea,
  Text,
  Alert,
  AlertIcon,
  Spinner,
  Icon,
  Progress,
} from "@chakra-ui/react";
import { AnimatePresence, motion } from "framer-motion";
import { ElementType, ReactNode, useEffect, useRef, useState } from "react";
import {
  FiCheck,
  FiCpu,
  FiFlag,
  FiLock,
  FiMessageSquare,
  FiShield,
  FiTool,
  FiUnlock,
} from "react-icons/fi";
import { IconType } from "react-icons";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { PageHeader } from "../../components/ui/PageHeader";
import { LoadingPanel } from "../../components/operations/LoadingPanel";
import { ErrorPanel } from "../../components/operations/ErrorPanel";
import { EmptyPanel } from "../../components/operations/EmptyPanel";
import { DetailCard } from "../../components/operations/DetailCard";
import {
  createAgentSession,
  getSessionDetail,
  getSessionLogs,
  listAgentSessions,
  sendMessage,
  updateSessionTitle,
} from "./api";
import { ChatMessage, SessionSummary, SessionDetail, SessionLog } from "./types";
import { formatDateTime } from "../../lib/format";

const MotionBox = motion(Box);

type OptimisticMessage = {
  id: string;
  session_id: string;
  role: "user" | "assistant";
  content: string;
  metadata: string | null;
  created_at: string;
  pending?: boolean;
};

const isPendingMessage = (message: ChatMessage | OptimisticMessage): message is OptimisticMessage => {
  return "pending" in message && message.pending === true;
};

type TurnStepStatus = "pending" | "active" | "complete" | "blocked";

type TurnStep = {
  id: string;
  label: string;
  detail: string;
  status: TurnStepStatus;
  icon: IconType;
};

const getLogTime = (log: SessionLog): number => {
  if (!log.timestamp) return 0;
  const hasTimezone = /(?:Z|[+-]\d{2}:\d{2})$/.test(log.timestamp);
  const normalizedTimestamp = hasTimezone ? log.timestamp : `${log.timestamp}Z`;
  const value = new Date(normalizedTimestamp).getTime();
  return Number.isNaN(value) ? 0 : value;
};

const readString = (value: unknown): string | null => {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
};

const wait = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

const buildTurnSteps = (logs: SessionLog[], startedAt: string | null, isSending: boolean): TurnStep[] => {
  const startedAtMs = startedAt ? new Date(startedAt).getTime() - 1000 : 0;
  const turnLogs = logs
    .filter((log) => getLogTime(log) >= startedAtMs)
    .sort((a, b) => getLogTime(a) - getLogTime(b));

  const hasIntentGuard = turnLogs.some(
    (log) =>
      log.event_type === "intent_guard_decision" ||
      (log.event_type === "node_transition" &&
        Boolean(readString(log.event_data.to)?.startsWith("intent_guard_")))
  );
  const hasTool = turnLogs.some((log) =>
    ["tool_call", "tool_call_attempt", "tool_call_result", "enforcement_decision"].includes(log.event_type)
  );
  const hasApproval = turnLogs.some((log) => log.event_type === "approval_requested");
  const hasSessionEnd = turnLogs.some((log) => log.event_type === "session_end");
  const isPausedOrBlocked = turnLogs.some((log) => {
    const status = readString(log.event_data.status);
    const decision = readString(log.event_data.decision);
    const action = readString(log.event_data.action);
    return (
      status === "paused" ||
      status === "terminated" ||
      decision === "block" ||
      decision === "pause" ||
      action === "block" ||
      action === "pause_for_approval"
    );
  });

  const toolName =
    turnLogs
      .map((log) => readString(log.event_data.tool_name) || readString(log.event_data.tool))
      .find(Boolean) || "selected tool";
  const guardDecision = turnLogs.find((log) => log.event_type === "intent_guard_decision");
  const guardAction = guardDecision ? readString(guardDecision.event_data.action) : null;
  const guardRisk = guardDecision ? readString(guardDecision.event_data.risk_level) : null;
  const enforcement = turnLogs.find((log) => log.event_type === "enforcement_decision");
  const enforcementDecision = enforcement ? readString(enforcement.event_data.decision) : null;
  const toolResult = turnLogs.find((log) => log.event_type === "tool_call_result");
  const finalStatus = readString(turnLogs.find((log) => log.event_type === "session_end")?.event_data.status);
  const hasReasonStarted = turnLogs.some(
    (log) => log.event_type === "node_transition" && log.event_data.to === "reason"
  );
  const hasActionDecision = turnLogs.some(
    (log) => log.event_type === "node_transition" && log.event_data.to === "decide_action"
  );

  const steps: TurnStep[] = [
    {
      id: "message",
      label: "Message accepted",
      detail: turnLogs.some((log) => log.event_type === "session_start")
        ? "The chat turn is running in the agent runtime."
        : "Waiting for the backend to start this turn.",
      status: turnLogs.some((log) => log.event_type === "session_start") ? "complete" : "active",
      icon: FiMessageSquare,
    },
    {
      id: "intent_guard",
      label: "Policy and intent check",
      detail: guardDecision
        ? `Intent guard ${guardAction || "checked"}${guardRisk ? ` with ${guardRisk} risk` : ""}.`
        : hasIntentGuard
          ? "Checking the message against the agent policy."
          : "Queued for policy review.",
      status: guardDecision ? "complete" : hasIntentGuard ? "active" : "pending",
      icon: FiShield,
    },
    {
      id: "reason",
      label: "Model reasoning",
      detail: hasReasonStarted
        ? "Gemini is preparing the next response or deciding whether a tool is needed."
        : "Waiting for Gemini.",
      status: hasTool || hasSessionEnd || hasApproval
        ? "complete"
        : hasReasonStarted || (isSending && hasActionDecision)
          ? "active"
          : "pending",
      icon: FiCpu,
    },
  ];

  if (hasTool) {
    steps.push({
      id: "tool_decision",
      label: `Tool check: ${toolName}`,
      detail: enforcement
        ? `${toolName} was ${enforcementDecision || "checked"} by the tool policy.`
        : `Checking whether ${toolName} can run.`,
      status: enforcement ? (enforcementDecision === "block" || enforcementDecision === "pause" ? "blocked" : "complete") : "active",
      icon: enforcementDecision === "block" || enforcementDecision === "pause" ? FiLock : FiUnlock,
    });

    steps.push({
      id: "tool_execution",
      label: `Tool call: ${toolName}`,
      detail: toolResult
        ? `${toolName} finished with ${readString(toolResult.event_data.status) || "a result"}.`
        : `Running ${toolName}.`,
      status: toolResult ? "complete" : enforcementDecision === "allow" ? "active" : "pending",
      icon: FiTool,
    });
  }

  if (hasApproval) {
    steps.push({
      id: "approval",
      label: "Approval requested",
      detail: "This turn needs human approval before it can continue.",
      status: "blocked",
      icon: FiLock,
    });
  }

  steps.push({
    id: "final",
    label: "Final response",
    detail: hasSessionEnd
      ? `Turn finished${finalStatus ? ` with status ${finalStatus}` : ""}.`
      : "Waiting for the final assistant message.",
    status: hasSessionEnd ? (isPausedOrBlocked ? "blocked" : "complete") : "pending",
    icon: FiFlag,
  });

  return steps;
};

const TurnProgress = ({
  logs,
  startedAt,
  isSending,
}: {
  logs: SessionLog[];
  startedAt: string | null;
  isSending: boolean;
}) => {
  const steps = buildTurnSteps(logs, startedAt, isSending);
  const completed = steps.filter((step) => step.status === "complete" || step.status === "blocked").length;
  const progressValue = steps.length > 0 ? Math.round((completed / steps.length) * 100) : 0;

  return (
    <Box
      p={3}
      bg="surface.secondary"
      color="text.primary"
      borderRadius="lg"
      border="1px solid"
      borderColor="border.soft"
      width={{ base: "92%", md: "680px" }}
      maxW="92%"
      h="220px"
      overflow="hidden"
    >
      <HStack justify="space-between" mb={2}>
        <HStack spacing={2}>
          <Spinner size="xs" color="brand.500" />
          <Text fontSize="sm" fontWeight="800" color="black">
            Agent is working
          </Text>
        </HStack>
        <Text fontSize="xs" color="text.secondary">
          Live
        </Text>
      </HStack>
      <Progress value={progressValue} size="xs" borderRadius="full" colorScheme="brand" bg="gray.200" mb={2} />
      <VStack align="stretch" spacing={1}>
        {steps.map((step, index) => {
          const isComplete = step.status === "complete";
          const isBlocked = step.status === "blocked";
          const isActive = step.status === "active";
          const iconColor = isBlocked ? "orange.500" : isComplete ? "green.500" : isActive ? "brand.500" : "gray.400";
          const borderColor = isBlocked ? "orange.300" : isComplete ? "green.300" : isActive ? "brand.300" : "gray.300";
          const StepIcon = (isComplete ? FiCheck : step.icon) as ElementType;

          return (
            <HStack key={step.id} align="start" spacing={2}>
              <VStack spacing={0} align="center">
                <Flex
                  w="22px"
                  h="22px"
                  align="center"
                  justify="center"
                  borderRadius="full"
                  border="1px solid"
                  borderColor={borderColor}
                  bg={isComplete || isBlocked || isActive ? "white" : "gray.100"}
                >
                  {isActive ? <Spinner size="xs" color={iconColor} /> : <Icon as={StepIcon} color={iconColor} boxSize={3} />}
                </Flex>
                {index < steps.length - 1 ? (
                  <Box w="1px" h="6px" bg={isComplete || isBlocked ? borderColor : "gray.200"} />
                ) : null}
              </VStack>
              <Box flex="1" minW={0}>
                <HStack align="baseline" spacing={2} minW={0}>
                  <Text fontSize="xs" fontWeight="800" color="black" flexShrink={0}>
                    {step.label}
                  </Text>
                  <Text
                    fontSize="xs"
                    color={step.status === "pending" ? "gray.500" : "text.secondary"}
                    noOfLines={1}
                    minW={0}
                    flex="1"
                  >
                    {step.detail}
                  </Text>
                </HStack>
              </Box>
            </HStack>
          );
        })}
      </VStack>
    </Box>
  );
};

const ChatMessageBubble = ({
  message,
  metadata,
}: {
  message: ChatMessage | OptimisticMessage;
  metadata: ReactNode;
}) => {
  const isUser = message.role === "user";

  return (
    <Flex justify={isUser ? "flex-end" : "flex-start"} width="100%">
      <Box maxW={{ base: "92%", md: "72%" }}>
        <HStack justify={isUser ? "flex-end" : "flex-start"} spacing={2} mb={1} px={1}>
          <Text fontSize="xs" fontWeight="700" color="text.secondary">
            {isUser ? "You" : "Agent"}
          </Text>
          <Text fontSize="xs" color="text.secondary">
            {formatDateTime(message.created_at)}
          </Text>
        </HStack>
        <Box
          px={3.5}
          py={2.5}
          bg={isUser ? "brand.600" : "surface.secondary"}
          color={isUser ? "white" : "text.primary"}
          borderRadius="lg"
          borderTopRightRadius={isUser ? "sm" : "lg"}
          borderTopLeftRadius={isUser ? "lg" : "sm"}
          border="1px solid"
          borderColor={isUser ? "brand.600" : "border.soft"}
          boxShadow="sm"
        >
          <Text fontSize="sm" whiteSpace="pre-wrap">
            {message.content}
          </Text>
          {metadata}
        </Box>
      </Box>
    </Flex>
  );
};

export const AgentChatPage = () => {
  const { agentId } = useParams<{ agentId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const toast = useToast();

  const agentIdNum = agentId ? parseInt(agentId, 10) : null;
  if (!agentIdNum) {
    return <ErrorPanel title="Invalid agent" message="Agent ID is missing." />;
  }

  const initialSessionId = searchParams.get("sessionId");
  const viewMode = (searchParams.get("view") || "chat") as "chat" | "history";

  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(initialSessionId);

  const [sessionDetail, setSessionDetail] = useState<SessionDetail | null>(null);
  const [sessionLoading, setSessionLoading] = useState(false);
  const [sessionError, setSessionError] = useState<string | null>(null);

  const [messageInput, setMessageInput] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);
  const [optimisticMessages, setOptimisticMessages] = useState<OptimisticMessage[]>([]);
  const [turnLogs, setTurnLogs] = useState<SessionLog[]>([]);
  const [turnStartedAt, setTurnStartedAt] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");

  const messagesScrollRef = useRef<HTMLDivElement>(null);

  const loadSessions = async () => {
    setSessionsLoading(true);
    try {
      const result = await listAgentSessions(agentIdNum);
      setSessions(result);
      if (!currentSessionId && result.length === 0) {
        const newSession = await createAgentSession(agentIdNum);
        setCurrentSessionId(newSession.session_id);
        setSessions([newSession]);
      }
    } catch (error) {
      toast({
        title: "Failed to load sessions",
        description: error instanceof Error ? error.message : "Unknown error",
        status: "error",
        duration: 3000,
      });
    } finally {
      setSessionsLoading(false);
    }
  };

  const loadSessionDetail = async (
    sessionId: string,
    options: { showLoading?: boolean } = {}
  ) => {
    const showLoading = options.showLoading ?? true;
    if (showLoading) {
      setSessionLoading(true);
    }
    setSessionError(null);
    try {
      const detail = await getSessionDetail(sessionId);
      setSessionDetail(detail);
      setTitleDraft(detail.title || "");
    } catch (error) {
      setSessionError(error instanceof Error ? error.message : "Failed to load session");
    } finally {
      if (showLoading) {
        setSessionLoading(false);
      }
    }
  };

  useEffect(() => {
    void loadSessions();
  }, [agentIdNum]);

  useEffect(() => {
    if (currentSessionId) {
      setOptimisticMessages([]);
      setTurnLogs([]);
      setTurnStartedAt(null);
      void loadSessionDetail(currentSessionId);
    }
  }, [currentSessionId]);

  useEffect(() => {
    if (!sendingMessage || !currentSessionId) return;

    let isMounted = true;

    const loadLogs = async () => {
      try {
        const result = await getSessionLogs(currentSessionId);
        if (isMounted) {
          setTurnLogs(result.logs);
        }
      } catch {
        // Logs can briefly lag behind the newly submitted turn.
      }
    };

    void loadLogs();
    const intervalId = window.setInterval(loadLogs, 700);

    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
    };
  }, [currentSessionId, sendingMessage]);

  const visibleMessages = sessionDetail
    ? [...sessionDetail.messages, ...optimisticMessages]
    : optimisticMessages;

  useEffect(() => {
    if (!messagesScrollRef.current) return;
    messagesScrollRef.current.scrollTop = messagesScrollRef.current.scrollHeight;
  }, [visibleMessages.length]);

  const handleSendMessage = async () => {
    if (!messageInput.trim() || !currentSessionId || sendingMessage) return;

    const content = messageInput.trim();
    const sentAt = new Date().toISOString();
    const wasFirstMessage = (sessionDetail?.messages.length ?? 0) === 0;
    const pendingMessages: OptimisticMessage[] = [
      {
        id: `pending-user-${Date.now()}`,
        session_id: currentSessionId,
        role: "user",
        content,
        metadata: null,
        created_at: sentAt,
      },
      {
        id: `pending-assistant-${Date.now()}`,
        session_id: currentSessionId,
        role: "assistant",
        content: "Thinking",
        metadata: null,
        created_at: sentAt,
        pending: true,
      },
    ];

    setMessageInput("");
    setOptimisticMessages(pendingMessages);
    setTurnLogs([]);
    setTurnStartedAt(sentAt);
    setSendingMessage(true);

    try {
      const assistantReply = await sendMessage(currentSessionId, content);
      try {
        const result = await getSessionLogs(currentSessionId);
        setTurnLogs(result.logs);
      } catch {
        // The answer can still be shown even if the final log refresh fails.
      }
      await wait(750);
      setOptimisticMessages([
        pendingMessages[0],
        {
          id: `optimistic-answer-${assistantReply.id}`,
          session_id: assistantReply.session_id,
          role: "assistant",
          content: assistantReply.content,
          metadata: assistantReply.metadata,
          created_at: assistantReply.created_at,
        },
      ]);
      await wait(260);
      await loadSessionDetail(currentSessionId, { showLoading: false });
      setOptimisticMessages([]);
      
      if (!sessionDetail?.title && wasFirstMessage) {
        const newTitle = content.substring(0, 50) + (content.length > 50 ? "..." : "");
        await updateSessionTitle(currentSessionId, newTitle);
        await loadSessionDetail(currentSessionId, { showLoading: false });
      }
    } catch (error) {
      toast({
        title: "Failed to send message",
        description: error instanceof Error ? error.message : "Unknown error",
        status: "error",
        duration: 3000,
      });
      setOptimisticMessages([]);
    } finally {
      setSendingMessage(false);
    }
  };

  const handleCreateNewSession = async () => {
    try {
      const newSession = await createAgentSession(agentIdNum);
      setSessions([newSession, ...sessions]);
      setCurrentSessionId(newSession.session_id);
    } catch (error) {
      toast({
        title: "Failed to create session",
        description: error instanceof Error ? error.message : "Unknown error",
        status: "error",
        duration: 3000,
      });
    }
  };

  const handleUpdateTitle = async () => {
    if (!currentSessionId) return;
    try {
      await updateSessionTitle(currentSessionId, titleDraft || null);
      await loadSessionDetail(currentSessionId);
      await loadSessions();
      setEditingTitle(false);
      toast({
        title: "Title updated",
        status: "success",
        duration: 2000,
      });
    } catch (error) {
      toast({
        title: "Failed to update title",
        description: error instanceof Error ? error.message : "Unknown error",
        status: "error",
        duration: 3000,
      });
    }
  };

  const renderMessageMetadata = (metadata?: string | null) => {
    if (!metadata) {
      return null;
    }

    try {
      const parsed = JSON.parse(metadata);
      const errorText = String(parsed.error || "");
      if (errorText.toLowerCase().includes("intent guard")) {
        return (
          <Alert status="warning" borderRadius="md" mt={3}>
            <AlertIcon />
            <VStack align="start" spacing={1}>
              <Text fontWeight="700">Safety Approval</Text>
              <Text>{errorText}</Text>
            </VStack>
          </Alert>
        );
      }
      if (parsed.status === "paused") {
        return (
          <Alert status="info" borderRadius="md" mt={3}>
            <AlertIcon />
            <VStack align="start" spacing={1}>
              <Text fontWeight="700">Policy Approval</Text>
              <Text>{errorText || "This turn is waiting for approval."}</Text>
            </VStack>
          </Alert>
        );
      }
    } catch {
      return null;
    }

    return null;
  };

  return (
    <Flex direction="column" height="100%" maxH="100%" minH={0} bg="surface.primary" overflow="hidden">
      <Box px={6} pt={0} pb={4} borderBottom="1px solid" borderColor="border.soft">
        <PageHeader
          title="Agent Chat"
          description="Chat with your agent and review conversation history"
        />
      </Box>

      <Flex flex="1" minH={0} overflow="hidden">
        {/* Sidebar */}
        <Box
          width="300px"
          borderRight="1px solid"
          borderColor="border.soft"
          display={{ base: "none", lg: "flex" }}
          flexDirection="column"
          minH={0}
          overflow="hidden"
        >
          <VStack align="stretch" spacing={0} p={4} flexShrink={0}>
            <Button onClick={handleCreateNewSession} colorScheme="brand" mb={4}>
              New chat
            </Button>

            <Text fontSize="xs" fontWeight="700" color="text.secondary" mb={2}>
              RECENT SESSIONS
            </Text>
          </VStack>

          <VStack align="stretch" spacing={0} px={4} pb={4} flex="1" minH={0} overflowY="auto">
            {sessionsLoading ? (
              <Text color="text.secondary" fontSize="sm">Loading...</Text>
            ) : sessions.length === 0 ? (
              <Text color="text.secondary" fontSize="sm">No sessions yet</Text>
            ) : (
              sessions.map((session) => (
                <Button
                  key={session.session_id}
                  onClick={() => setCurrentSessionId(session.session_id)}
                  variant={currentSessionId === session.session_id ? "solid" : "ghost"}
                  justifyContent="flex-start"
                  textAlign="left"
                  whiteSpace="normal"
                  height="auto"
                  py={2}
                  mb={2}
                >
                  <VStack align="start" spacing={0} width="100%">
                    <Text fontSize="sm" fontWeight="600">
                      {session.title || "Untitled"}
                    </Text>
                    <Text fontSize="xs" color="text.secondary">
                      {formatDateTime(session.created_at)}
                    </Text>
                  </VStack>
                </Button>
              ))
            )}
          </VStack>
        </Box>

        {/* Main Chat Area */}
        <Flex flex="1" flexDirection="column" minH={0} overflow="hidden">
          {sessionLoading ? (
            <Box flex="1" display="flex" alignItems="center" justifyContent="center">
              <LoadingPanel label="Loading session..." />
            </Box>
          ) : sessionError ? (
            <Box flex="1" display="flex" alignItems="center" justifyContent="center">
              <ErrorPanel title="Error" message={sessionError} />
            </Box>
          ) : !sessionDetail ? (
            <Box flex="1" display="flex" alignItems="center" justifyContent="center">
              <EmptyPanel
                title="No session selected"
                description="Select a session from the sidebar or create a new one to get started."
              />
            </Box>
          ) : (
            <>
              {/* Session Header */}
              <Box borderBottom="1px solid" borderColor="border.soft" p={4}>
                <HStack justify="space-between">
                  <VStack align="start" spacing={0}>
                    {editingTitle ? (
                      <HStack>
                        <Input
                          size="sm"
                          value={titleDraft}
                          onChange={(e) => setTitleDraft(e.target.value)}
                          placeholder="Session title"
                          width="200px"
                        />
                        <Button size="sm" onClick={handleUpdateTitle}>
                          Save
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setEditingTitle(false)}
                        >
                          Cancel
                        </Button>
                      </HStack>
                    ) : (
                      <HStack>
                        <Text fontWeight="700">
                          {sessionDetail.title || "Untitled Session"}
                        </Text>
                        <Button
                          size="xs"
                          variant="ghost"
                          onClick={() => setEditingTitle(true)}
                        >
                          Rename
                        </Button>
                      </HStack>
                    )}
                    <Text fontSize="xs" color="text.secondary">
                      {visibleMessages.length} messages
                    </Text>
                  </VStack>
                  <HStack>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => navigate(`/sessions?agentId=${agentIdNum}&sessionId=${sessionDetail.session_id}`)}
                    >
                      View in Sessions
                    </Button>
                  </HStack>
                </HStack>
              </Box>

              {/* Chat / History Views */}
              <Tabs
                variant="soft-rounded"
                colorScheme="brand"
                flex="1"
                display="flex"
                flexDirection="column"
                minH={0}
                overflow="hidden"
              >
                <TabList px={4} pt={4}>
                  <Tab>Chat</Tab>
                  <Tab>History</Tab>
                </TabList>

                <TabPanels flex="1" display="flex" flexDirection="column" minH={0} overflow="hidden">
                  {/* Chat Tab */}
                  <TabPanel p={0} flex="1" display="flex" flexDirection="column" minH={0} overflow="hidden">
                    <Flex flex="1" direction="column" minH={0} overflow="hidden">
                      {/* Messages */}
                      <VStack
                        ref={messagesScrollRef}
                        flex="1"
                        align="stretch"
                        spacing={3}
                        minH={0}
                        overflowY="auto"
                        px={4}
                        py={4}
                      >
                        {visibleMessages.length === 0 ? (
                          <Flex
                            flex="1"
                            alignItems="center"
                            justifyContent="center"
                            color="text.secondary"
                          >
                            <Text>No messages yet. Start the conversation!</Text>
                          </Flex>
                        ) : (
                          <AnimatePresence initial={false}>
                            {visibleMessages.map((msg) => {
                              const shouldAnimate =
                                isPendingMessage(msg) ||
                                (typeof msg.id === "string" && msg.role === "assistant");
                              const content = isPendingMessage(msg) ? (
                                <Flex justify="flex-start" width="100%">
                                  <TurnProgress logs={turnLogs} startedAt={turnStartedAt} isSending={sendingMessage} />
                                </Flex>
                              ) : (
                                <ChatMessageBubble
                                  message={msg}
                                  metadata={renderMessageMetadata(msg.metadata)}
                                />
                              );

                              if (shouldAnimate) {
                                return (
                                  <MotionBox
                                    key={msg.id}
                                    width="100%"
                                    initial={{ opacity: 0, y: 4 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -4 }}
                                    transition={{ duration: 0.2, ease: "easeOut" }}
                                  >
                                    {content}
                                  </MotionBox>
                                );
                              }

                              return (
                                <Box key={msg.id} width="100%">
                                  {content}
                                </Box>
                              );
                            })}
                          </AnimatePresence>
                        )}
                      </VStack>

                      {/* Message Composer */}
                      <VStack
                        align="stretch"
                        spacing={2}
                        px={4}
                        py={3}
                        borderTop="1px solid"
                        borderColor="border.soft"
                        bg="surface.primary"
                        flexShrink={0}
                      >
                        <HStack align="flex-end" spacing={3}>
                          <Textarea
                            value={messageInput}
                            onChange={(e) => setMessageInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && !e.shiftKey) {
                                e.preventDefault();
                                void handleSendMessage();
                              }
                            }}
                            placeholder="Type your message... (Shift+Enter for new line)"
                            minH="80px"
                            flex="1"
                          />
                          <Button
                            onClick={handleSendMessage}
                            isDisabled={!messageInput.trim() || sendingMessage}
                            colorScheme="brand"
                            alignSelf="flex-end"
                          >
                            Send
                          </Button>
                        </HStack>
                      </VStack>
                    </Flex>
                  </TabPanel>

                  {/* History Tab */}
                  <TabPanel flex="1" minH={0} overflowY="auto">
                    <VStack align="stretch" spacing={3}>
                      {sessionDetail.messages.length === 0 ? (
                        <EmptyPanel
                          title="No messages"
                          description="No conversation history for this session yet."
                        />
                      ) : (
                        sessionDetail.messages.map((msg) => (
                          <DetailCard
                            key={msg.id}
                            title={msg.role === "user" ? "User Message" : "Assistant Response"}
                            subtitle={formatDateTime(msg.created_at)}
                          >
                            <VStack align="start" spacing={2}>
                              <Text>{msg.content}</Text>
                              {renderMessageMetadata(msg.metadata)}
                              {msg.metadata && (
                                <Box
                                  p={2}
                                  bg="surface.secondary"
                                  borderRadius="sm"
                                  width="100%"
                                  fontSize="xs"
                                  color="text.secondary"
                                >
                                  <Text>Metadata: {msg.metadata}</Text>
                                </Box>
                              )}
                            </VStack>
                          </DetailCard>
                        ))
                      )}
                    </VStack>
                  </TabPanel>
                </TabPanels>
              </Tabs>
            </>
          )}
        </Flex>
      </Flex>
    </Flex>
  );
};
