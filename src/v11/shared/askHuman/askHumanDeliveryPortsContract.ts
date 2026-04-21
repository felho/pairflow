import type { BubbleConfig } from "../../../types/bubble.js";
import type { ProtocolEnvelope } from "../../../types/protocol.js";
import type {
  DeliveryAck,
  DeliveryTargetReasonCode,
  EmitDeliveryNotificationInput
} from "../delivery/tmuxDeliveryContract.js";
import type {
  EmitDeliveryNotificationAckPort
} from "../ports/tmuxDelivery.js";

export type AskHumanBubbleNotificationKind = "waiting-human" | "converged";

export type AskHumanDeliveryFailureReason =
  Extract<DeliveryAck, { status: "rejected" }>["reason"];

export type AskHumanDeliveryTargetReasonCode = DeliveryTargetReasonCode;

export type AskHumanEmitDeliveryNotificationInput = EmitDeliveryNotificationInput;

export type AskHumanEmitTmuxDeliveryNotificationInput =
  AskHumanEmitDeliveryNotificationInput;

export type AskHumanDeliveryAck = DeliveryAck;

export type AskHumanEmitTmuxDeliveryNotificationResult = AskHumanDeliveryAck;

export interface ResolveAskHumanDeliveryMessageRefInput {
  bubbleId: string;
  sessionsPath: string;
  envelope: ProtocolEnvelope;
  messageRef?: string;
}

export type EmitAskHumanDeliveryNotificationAckPort =
  EmitDeliveryNotificationAckPort;

export type EmitAskHumanTmuxDeliveryNotificationPort =
  EmitAskHumanDeliveryNotificationAckPort;

export type ResolveAskHumanDeliveryMessageRefPort = (
  input: ResolveAskHumanDeliveryMessageRefInput
) => string;

export type EmitAskHumanBubbleNotificationPort = (
  config: BubbleConfig,
  kind: AskHumanBubbleNotificationKind
) => Promise<unknown>;
