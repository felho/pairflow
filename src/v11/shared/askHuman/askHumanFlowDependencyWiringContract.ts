import type {
  EmitAskHumanBubbleNotificationPort,
  EmitAskHumanTmuxDeliveryNotificationPort
} from "./askHumanDeliveryPortsContract.js";

export interface AskHumanFlowRuntimeDependencies {
  emitTmuxDeliveryNotification?:
    | EmitAskHumanTmuxDeliveryNotificationPort
    | undefined;
  emitBubbleNotification?: EmitAskHumanBubbleNotificationPort | undefined;
}
