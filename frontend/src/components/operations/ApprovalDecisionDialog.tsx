import {
  Button,
  Checkbox,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Text,
  Textarea,
  VStack,
  Input,
} from "@chakra-ui/react";
import { useEffect, useState } from "react";

export type ApprovalDecisionIntent = "approve" | "deny";

type ApprovalDecisionDialogProps = {
  isOpen: boolean;
  intent: ApprovalDecisionIntent;
  sessionId?: string;
  isSubmitting?: boolean;
  onClose: () => void;
  onConfirm: (payload: { decidedBy: string; reason: string; resumeAfterApproval: boolean }) => void;
};

export const ApprovalDecisionDialog = ({
  isOpen,
  intent,
  sessionId,
  isSubmitting,
  onClose,
  onConfirm,
}: ApprovalDecisionDialogProps) => {
  const [decidedBy, setDecidedBy] = useState("system");
  const [reason, setReason] = useState("");
  const [resumeAfterApproval, setResumeAfterApproval] = useState(true);

  useEffect(() => {
    if (isOpen) {
      setDecidedBy("system");
      setReason("");
      setResumeAfterApproval(true);
    }
  }, [isOpen]);

  const title = intent === "approve" ? "Approve session" : "Deny session";
  const confirmLabel = intent === "approve" ? "Approve" : "Deny";

  return (
    <Modal isOpen={isOpen} onClose={onClose} isCentered size="lg">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>{title}</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <VStack align="stretch" spacing={4}>
            {sessionId ? (
              <Text color="text.secondary" fontSize="sm">
                Decision for session {sessionId}
              </Text>
            ) : null}
            <VStack align="stretch" spacing={2}>
              <Text fontSize="sm" fontWeight="700" color="text.secondary">
                Decided by
              </Text>
              <Input value={decidedBy} onChange={(event) => setDecidedBy(event.target.value)} />
            </VStack>
            <VStack align="stretch" spacing={2}>
              <Text fontSize="sm" fontWeight="700" color="text.secondary">
                Reason
              </Text>
              <Textarea
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                placeholder="Optional context for the audit trail"
              />
            </VStack>
            {intent === "approve" ? (
              <Checkbox
                isChecked={resumeAfterApproval}
                onChange={(event) => setResumeAfterApproval(event.target.checked)}
                colorScheme="brand"
              >
                Resume session after approval
              </Checkbox>
            ) : null}
          </VStack>
        </ModalBody>
        <ModalFooter>
          <Button variant="ghost" mr={3} onClick={onClose}>
            Cancel
          </Button>
          <Button
            colorScheme={intent === "approve" ? "brand" : "red"}
            onClick={() => onConfirm({ decidedBy, reason, resumeAfterApproval })}
            isLoading={isSubmitting}
            loadingText={confirmLabel}
          >
            {confirmLabel}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};
