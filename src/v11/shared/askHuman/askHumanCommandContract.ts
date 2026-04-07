import type {
  AskHumanDeliveryTargetReasonCode,
  AskHumanEmitTmuxDeliveryNotificationResult,
  EmitAskHumanBubbleNotificationPort,
  EmitAskHumanTmuxDeliveryNotificationPort
} from "./askHumanDeliveryPortsContract.js";
import type { BubbleStateSnapshot } from "../../../types/bubble.js";
import type { ProtocolEnvelope } from "../../../types/protocol.js";
import type { ActorEmitContextSnapshot } from "../actorProtocol/actorEmitContext.js";

export interface EmitAskHumanInput {
  question: string;
  refs?: string[];
  cwd?: string;
  authoritativeContext?: ActorEmitContextSnapshot;
  now?: Date;
}

export interface EmitAskHumanResult {
  bubbleId: string;
  sequence: number;
  envelope: ProtocolEnvelope;
  state: BubbleStateSnapshot;
  inferredRecipient: "human";
  delivery?: {
    delivered: boolean;
    message?: string;
    reason?: Exclude<
      AskHumanEmitTmuxDeliveryNotificationResult["reason"],
      undefined
    >;
    deliveryTargetReasonCode?: AskHumanDeliveryTargetReasonCode;
  };
}

export interface EmitAskHumanDependencies {
  emitTmuxDeliveryNotification?: EmitAskHumanTmuxDeliveryNotificationPort;
  emitBubbleNotification?: EmitAskHumanBubbleNotificationPort;
}
