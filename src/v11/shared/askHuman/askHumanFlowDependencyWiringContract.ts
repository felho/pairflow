import type {
  EmitAskHumanBubbleNotificationPort,
  EmitAskHumanDeliveryNotificationAckPort
} from "./askHumanDeliveryPortsContract.js";

export interface AskHumanFlowRuntimeDependencies {
  emitDeliveryNotificationAck?:
    | EmitAskHumanDeliveryNotificationAckPort
    | undefined;
  emitBubbleNotification?: EmitAskHumanBubbleNotificationPort | undefined;
}
