import type {
  EmitAskHumanBubbleNotificationPort
} from "./askHumanDeliveryPortsContract.js";
import type { EmitDeliveryNotificationAckPort } from "../ports/tmuxDelivery.js";

export interface AskHumanRuntimeNotificationDependencies {
  emitDeliveryNotificationAck?:
    | EmitDeliveryNotificationAckPort
    | undefined;
  emitBubbleNotification?: EmitAskHumanBubbleNotificationPort | undefined;
}

export interface ForwardedAskHumanRuntimeNotificationDependencies {
  emitDeliveryNotificationAck?:
    | EmitDeliveryNotificationAckPort
    | undefined;
  emitBubbleNotification?: EmitAskHumanBubbleNotificationPort | undefined;
}
