import type {
  AgentRole
} from "../../domain/agentIdentity/agentIdentity.js";
import type {
  BubbleConfig
} from "../config/bubbleConfigTypes.js";
import type {
  DeliveryTargetRole,
  ProtocolEnvelope
} from "../../../types/protocol.js";
import type { ReviewerTestExecutionDirective } from "../reviewer/testEvidence.js";
import type { ReviewerFocusExtractionResult } from "../reviewer/reviewerBrief.js";

interface EmitDeliveryNotificationInputBase {
  bubbleId: string;
  bubbleConfig: BubbleConfig;
  sessionsPath: string;
  envelope: ProtocolEnvelope;
  recipientRole?: DeliveryTargetRole;
  reviewerTestDirective?: ReviewerTestExecutionDirective;
  reviewerBrief?: string;
  reviewerFocus?: ReviewerFocusExtractionResult;
  messageRef?: string;
  initialDelayMs?: number;
  deliveryAttempts?: number;
}

export type EmitDeliveryNotificationInput = EmitDeliveryNotificationInputBase;

export type DeliveryFailureReason =
  | "no_runtime_session"
  | "unsupported_recipient"
  | "registry_read_failed"
  | "delivery_unconfirmed"
  | "command_failed";

export type DeliveryTargetReasonCode =
  | "DELIVERY_TARGET_ROLE_ABSENT"
  | "DELIVERY_TARGET_ROLE_INVALID"
  | "DELIVERY_TARGET_ROLE_UNMAPPED"
  | "DELIVERY_TARGET_REGISTRY_READ_FAILED";

export type DeliveryAckReasonCode =
  | "DELIVERY_ACK_RUNTIME_SESSION_UNAVAILABLE"
  | "DELIVERY_ACK_TARGET_UNSUPPORTED"
  | "DELIVERY_ACK_REJECTED";

export type DeliveryAckStatus = "accepted" | "rejected";

export interface AcceptedDeliveryAck {
  status: "accepted";
  sessionName?: string;
  targetPaneIndex?: number;
  message: string;
  deliveryTargetReasonCode?: DeliveryTargetReasonCode;
  reason?: never;
  reason_code?: never;
}

export interface RejectedDeliveryAck {
  status: "rejected";
  message: string;
  reason?: DeliveryFailureReason;
  reason_code?: DeliveryAckReasonCode;
  sessionName?: string;
  targetPaneIndex?: number;
  deliveryTargetReasonCode?: DeliveryTargetReasonCode;
}

export type DeliveryAck = AcceptedDeliveryAck | RejectedDeliveryAck;

export interface ResolveDeliveryMessageRefInput {
  bubbleId: string;
  sessionsPath: string;
  envelope: ProtocolEnvelope;
  messageRef?: string;
}

export interface RetryStuckAgentInputOptions {
  bubbleId: string;
  bubbleConfig: BubbleConfig;
  sessionsPath: string;
  activeRole: AgentRole;
}

export interface RetryStuckAgentInputResult {
  retried: boolean;
  reason?: "no_session" | "not_stuck" | "pane_read_failed";
}
