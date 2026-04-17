import type {
  AskHumanDeliveryTargetReasonCode,
  AskHumanEmitTmuxDeliveryNotificationResult,
  EmitAskHumanBubbleNotificationPort,
  EmitAskHumanTmuxDeliveryNotificationPort
} from "./askHumanDeliveryPortsContract.js";
import type { BubbleStateSnapshot } from "../../../types/bubble.js";
import type { ProtocolEnvelope } from "../../../types/protocol.js";
import type {
  ActorActivationProvenance,
  ActorEmitContextSnapshot
} from "../actorProtocol/actorEmitContext.js";

export type AskHumanActivationProvenance = ActorActivationProvenance;

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
  activation?: AskHumanActivationProvenance;
  delivery?: {
    status: AskHumanEmitTmuxDeliveryNotificationResult["status"];
    delivered: boolean;
    message?: string;
    reason?: AskHumanEmitTmuxDeliveryNotificationResult["reason"];
    reason_code?: AskHumanEmitTmuxDeliveryNotificationResult["reason_code"];
    deliveryTargetReasonCode?: AskHumanDeliveryTargetReasonCode;
  };
}

export interface EmitAskHumanDependencies {
  emitTmuxDeliveryNotification?: EmitAskHumanTmuxDeliveryNotificationPort;
  emitBubbleNotification?: EmitAskHumanBubbleNotificationPort;
}
