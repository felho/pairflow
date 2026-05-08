import type {
  EmitAskHumanBubbleNotificationPort
} from "./askHumanDeliveryPortsContract.js";
import type {
  EmitDeliveryNotificationAckPort,
  ResolveDeliveryMessageRefPort
} from "../../ports/tmuxDelivery.js";
import type { EmitBubbleLifecycleEventBestEffortPort } from "../../shared/metrics/bubbleEvents.js";
import type { PrepareAskHumanRoutingDependencies } from "./askHumanRoutingContract.js";

export interface AskHumanFlowRuntimeDependencies
  extends PrepareAskHumanRoutingDependencies {
  emitDeliveryNotificationAck?:
    | EmitDeliveryNotificationAckPort
    | undefined;
  emitBubbleNotification?: EmitAskHumanBubbleNotificationPort | undefined;
  resolveDeliveryMessageRef?: ResolveDeliveryMessageRefPort | undefined;
  emitBubbleLifecycleEventBestEffort?:
    | EmitBubbleLifecycleEventBestEffortPort
    | undefined;
}
