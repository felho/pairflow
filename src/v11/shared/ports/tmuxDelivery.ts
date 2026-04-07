import type { BubbleConfig } from "../../../types/bubble.js";
import type { ProtocolEnvelope } from "../../../types/protocol.js";
import type { ReviewerTestExecutionDirective } from "../reviewer/testEvidence.js";
import type { ReviewerFocusExtractionResult } from "../reviewer/reviewerBrief.js";

export interface EmitTmuxDeliveryNotificationInput {
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

export type TmuxDeliveryFailureReason =
  | "no_runtime_session"
  | "unsupported_recipient"
  | "registry_read_failed"
  | "delivery_unconfirmed"
  | "tmux_send_failed";

export type DeliveryTargetReasonCode =
  | "DELIVERY_TARGET_ROLE_ABSENT"
  | "DELIVERY_TARGET_ROLE_INVALID"
  | "DELIVERY_TARGET_ROLE_UNMAPPED"
  | "DELIVERY_TARGET_REGISTRY_READ_FAILED";

export interface EmitTmuxDeliveryNotificationResult {
  delivered: boolean;
  sessionName?: string;
  targetPaneIndex?: number;
  message: string;
  reason?: TmuxDeliveryFailureReason;
  deliveryTargetReasonCode?: DeliveryTargetReasonCode;
}

export interface ResolveDeliveryMessageRefInput {
  bubbleId: string;
  sessionsPath: string;
  envelope: ProtocolEnvelope;
  messageRef?: string;
}

export type EmitTmuxDeliveryNotificationPort = (
  input: EmitTmuxDeliveryNotificationInput
) => Promise<EmitTmuxDeliveryNotificationResult>;

export type ResolveDeliveryMessageRefPort = (
  input: ResolveDeliveryMessageRefInput
) => string;
