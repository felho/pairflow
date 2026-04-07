import type { BubbleConfig } from "../../../types/bubble.js";
import type { ProtocolEnvelope } from "../../../types/protocol.js";

export type AskHumanBubbleNotificationKind = "waiting-human" | "converged";

export type AskHumanTmuxDeliveryFailureReason =
  | "no_runtime_session"
  | "unsupported_recipient"
  | "registry_read_failed"
  | "delivery_unconfirmed"
  | "tmux_send_failed";

export type AskHumanDeliveryTargetReasonCode =
  | "DELIVERY_TARGET_ROLE_ABSENT"
  | "DELIVERY_TARGET_ROLE_INVALID"
  | "DELIVERY_TARGET_ROLE_UNMAPPED"
  | "DELIVERY_TARGET_REGISTRY_READ_FAILED";

export interface AskHumanEmitTmuxDeliveryNotificationInput {
  bubbleId: string;
  bubbleConfig: BubbleConfig;
  sessionsPath: string;
  envelope: ProtocolEnvelope;
  messageRef?: string;
}

export interface AskHumanEmitTmuxDeliveryNotificationResult {
  delivered: boolean;
  sessionName?: string;
  targetPaneIndex?: number;
  message: string;
  reason?: AskHumanTmuxDeliveryFailureReason;
  deliveryTargetReasonCode?: AskHumanDeliveryTargetReasonCode;
}

export interface ResolveAskHumanDeliveryMessageRefInput {
  bubbleId: string;
  sessionsPath: string;
  envelope: ProtocolEnvelope;
  messageRef?: string;
}

export type EmitAskHumanTmuxDeliveryNotificationPort = (
  input: AskHumanEmitTmuxDeliveryNotificationInput
) => Promise<AskHumanEmitTmuxDeliveryNotificationResult>;

export type ResolveAskHumanDeliveryMessageRefPort = (
  input: ResolveAskHumanDeliveryMessageRefInput
) => string;

export type EmitAskHumanBubbleNotificationPort = (
  config: BubbleConfig,
  kind: AskHumanBubbleNotificationKind
) => Promise<unknown>;
