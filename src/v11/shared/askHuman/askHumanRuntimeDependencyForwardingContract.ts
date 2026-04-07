import type {
  EmitAskHumanBubbleNotificationPort,
  EmitAskHumanTmuxDeliveryNotificationPort
} from "./askHumanDeliveryPortsContract.js";

export interface AskHumanRuntimeNotificationDependencies {
  emitTmuxDeliveryNotification?:
    | EmitAskHumanTmuxDeliveryNotificationPort
    | undefined;
  emitBubbleNotification?: EmitAskHumanBubbleNotificationPort | undefined;
}

export interface ForwardedAskHumanRuntimeNotificationDependencies {
  emitTmuxDeliveryNotification?:
    | EmitAskHumanTmuxDeliveryNotificationPort
    | undefined;
  emitBubbleNotification?: EmitAskHumanBubbleNotificationPort | undefined;
}
