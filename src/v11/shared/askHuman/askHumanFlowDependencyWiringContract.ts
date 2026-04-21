import type {
  EmitAskHumanBubbleNotificationPort
} from "./askHumanDeliveryPortsContract.js";
import type { EmitDeliveryNotificationAckPort } from "../ports/tmuxDelivery.js";

export interface AskHumanFlowRuntimeDependencies {
  emitDeliveryNotificationAck?:
    | EmitDeliveryNotificationAckPort
    | undefined;
  emitBubbleNotification?: EmitAskHumanBubbleNotificationPort | undefined;
}
