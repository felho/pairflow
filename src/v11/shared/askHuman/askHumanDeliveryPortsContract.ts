import type { BubbleConfig } from "../../../types/bubble.js";
import type { ProtocolEnvelope } from "../../../types/protocol.js";
import type {
  DeliveryTargetReasonCode,
  TmuxDeliveryAckReasonCode,
  TmuxDeliveryAckStatus,
  TmuxDeliveryFailureReason
} from "../delivery/tmuxDeliveryContract.js";

export type AskHumanBubbleNotificationKind = "waiting-human" | "converged";

export type AskHumanTmuxDeliveryFailureReason = TmuxDeliveryFailureReason;

export type AskHumanDeliveryTargetReasonCode = DeliveryTargetReasonCode;

export interface AskHumanEmitTmuxDeliveryNotificationInput {
  bubbleId: string;
  bubbleConfig: BubbleConfig;
  sessionsPath: string;
  envelope: ProtocolEnvelope;
  messageRef?: string;
}

export interface AskHumanEmitTmuxDeliveryNotificationResult {
  status: TmuxDeliveryAckStatus;
  delivered: boolean;
  sessionName?: string;
  targetPaneIndex?: number;
  message: string;
  reason?: AskHumanTmuxDeliveryFailureReason;
  reason_code?: TmuxDeliveryAckReasonCode;
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
