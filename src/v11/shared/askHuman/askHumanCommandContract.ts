import type {
  AskHumanDeliveryTargetReasonCode,
  AskHumanDeliveryAck,
  EmitAskHumanBubbleNotificationPort,
  EmitAskHumanDeliveryNotificationAckPort
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
    status: AskHumanDeliveryAck["status"];
    message?: string;
    reason?: Extract<AskHumanDeliveryAck, { status: "rejected" }>["reason"];
    reason_code?: Extract<AskHumanDeliveryAck, { status: "rejected" }>["reason_code"];
    deliveryTargetReasonCode?: AskHumanDeliveryTargetReasonCode;
  };
}

export interface EmitAskHumanDependencies {
  emitDeliveryNotificationAck?: EmitAskHumanDeliveryNotificationAckPort;
  emitBubbleNotification?: EmitAskHumanBubbleNotificationPort;
}
