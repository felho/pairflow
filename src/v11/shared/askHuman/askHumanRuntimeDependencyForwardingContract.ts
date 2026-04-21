import type {
  EmitAskHumanBubbleNotificationPort,
  EmitAskHumanDeliveryNotificationAckPort
} from "./askHumanDeliveryPortsContract.js";

export interface AskHumanRuntimeNotificationDependencies {
  emitDeliveryNotificationAck?:
    | EmitAskHumanDeliveryNotificationAckPort
    | undefined;
  emitBubbleNotification?: EmitAskHumanBubbleNotificationPort | undefined;
}

export interface ForwardedAskHumanRuntimeNotificationDependencies {
  emitDeliveryNotificationAck?:
    | EmitAskHumanDeliveryNotificationAckPort
    | undefined;
  emitBubbleNotification?: EmitAskHumanBubbleNotificationPort | undefined;
}
