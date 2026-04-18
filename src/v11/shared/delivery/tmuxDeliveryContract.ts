import type { AgentName, BubbleConfig } from "../../../types/bubble.js";
import type { ProtocolEnvelope } from "../../../types/protocol.js";
import type { ReviewerTestExecutionDirective } from "../reviewer/testEvidence.js";
import type { ReviewerFocusExtractionResult } from "../reviewer/reviewerBrief.js";

export interface EmitDeliveryNotificationInput {
  bubbleId: string;
  bubbleConfig: BubbleConfig;
  sessionsPath: string;
  envelope: ProtocolEnvelope;
  reviewerTestDirective?: ReviewerTestExecutionDirective;
  reviewerBrief?: string;
  reviewerFocus?: ReviewerFocusExtractionResult;
  messageRef?: string;
  initialDelayMs?: number;
  deliveryAttempts?: number;
}

export type EmitTmuxDeliveryNotificationInput = EmitDeliveryNotificationInput;

export type DeliveryFailureReason =
  | "no_runtime_session"
  | "unsupported_recipient"
  | "registry_read_failed"
  | "delivery_unconfirmed"
  | "tmux_send_failed";

export type TmuxDeliveryFailureReason = DeliveryFailureReason;

export type DeliveryTargetReasonCode =
  | "DELIVERY_TARGET_ROLE_ABSENT"
  | "DELIVERY_TARGET_ROLE_INVALID"
  | "DELIVERY_TARGET_ROLE_UNMAPPED"
  | "DELIVERY_TARGET_REGISTRY_READ_FAILED";

export type DeliveryAckReasonCode =
  | "DELIVERY_ACK_RUNTIME_SESSION_UNAVAILABLE"
  | "DELIVERY_ACK_TARGET_UNSUPPORTED"
  | "DELIVERY_ACK_REJECTED";

export type TmuxDeliveryAckReasonCode = DeliveryAckReasonCode;

export type DeliveryAckStatus = "accepted" | "rejected";

export type TmuxDeliveryAckStatus = DeliveryAckStatus;

export interface AcceptedDeliveryAck {
  status: "accepted";
  sessionName: string;
  targetPaneIndex: number;
  message: string;
  deliveryTargetReasonCode?: DeliveryTargetReasonCode;
  reason?: never;
  reason_code?: never;
}

export type AcceptedTmuxDeliveryAck = AcceptedDeliveryAck;

export interface RejectedDeliveryAck {
  status: "rejected";
  message: string;
  reason: DeliveryFailureReason;
  reason_code: DeliveryAckReasonCode;
  sessionName?: string;
  targetPaneIndex?: number;
  deliveryTargetReasonCode?: DeliveryTargetReasonCode;
}

export type RejectedTmuxDeliveryAck = RejectedDeliveryAck;

export type DeliveryAck = AcceptedDeliveryAck | RejectedDeliveryAck;

export type TmuxDeliveryAck = DeliveryAck;

export interface DeliveredTmuxDeliveryNotificationResult {
  delivered: true;
  sessionName?: string;
  targetPaneIndex?: number;
  message: string;
  deliveryTargetReasonCode?: DeliveryTargetReasonCode;
  reason?: never;
  reason_code?: never;
}

export interface RejectedTmuxDeliveryNotificationResult {
  delivered: false;
  message: string;
  reason?: DeliveryFailureReason;
  reason_code?: DeliveryAckReasonCode;
  sessionName?: string;
  targetPaneIndex?: number;
  deliveryTargetReasonCode?: DeliveryTargetReasonCode;
}

export type EmitTmuxDeliveryNotificationResult =
  | DeliveredTmuxDeliveryNotificationResult
  | RejectedTmuxDeliveryNotificationResult;

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
  activeAgent: AgentName;
}

export interface RetryStuckAgentInputResult {
  retried: boolean;
  reason?: "no_session" | "no_pane" | "not_stuck" | "pane_read_failed";
}
