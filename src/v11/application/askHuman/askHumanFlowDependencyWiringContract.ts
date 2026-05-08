import type {
  EmitAskHumanBubbleNotificationPort
} from "./askHumanDeliveryPortsContract.js";
import type {
  EmitDeliveryNotificationAckPort,
  ResolveDeliveryMessageRefPort
} from "../../ports/tmuxDelivery.js";
import type { EmitBubbleLifecycleEventBestEffortPort } from "../../shared/metrics/bubbleEvents.js";

export interface AskHumanFlowRuntimeDependencies {
  emitDeliveryNotificationAck?:
    | EmitDeliveryNotificationAckPort
    | undefined;
  emitBubbleNotification?: EmitAskHumanBubbleNotificationPort | undefined;
  resolveDeliveryMessageRef?: ResolveDeliveryMessageRefPort | undefined;
  emitBubbleLifecycleEventBestEffort?:
    | EmitBubbleLifecycleEventBestEffortPort
    | undefined;
}
