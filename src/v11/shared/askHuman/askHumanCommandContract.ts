import type { emitBubbleNotification } from "../../infrastructure/channel/notifications.js";
import type {
  DeliveryTargetReasonCode,
  EmitTmuxDeliveryNotificationResult,
  emitTmuxDeliveryNotification
} from "../../infrastructure/channel/tmux/tmuxDelivery.js";
import type { BubbleStateSnapshot } from "../../../types/bubble.js";
import type { ProtocolEnvelope } from "../../../types/protocol.js";
import type { ActorEmitContextSnapshot } from "../../../core/bubble/actorEmitContext.js";

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
    reason?: Exclude<EmitTmuxDeliveryNotificationResult["reason"], undefined>;
    deliveryTargetReasonCode?: DeliveryTargetReasonCode;
  };
}

export interface EmitAskHumanDependencies {
  emitTmuxDeliveryNotification?: typeof emitTmuxDeliveryNotification;
  emitBubbleNotification?: typeof emitBubbleNotification;
}
