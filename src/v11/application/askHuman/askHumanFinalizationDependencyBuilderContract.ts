import type { EmitBubbleLifecycleEventBestEffortPort } from "../../shared/metrics/bubbleEvents.js";
import type {
  EmitAskHumanBubbleNotificationPort,
} from "./askHumanDeliveryPortsContract.js";
import type {
  EmitDeliveryNotificationAckPort,
  ResolveDeliveryMessageRefPort
} from "../../ports/tmuxDelivery.js";

export interface AskHumanFinalizationDependencySource {
  emitDeliveryNotificationAck?:
    | EmitDeliveryNotificationAckPort
    | undefined;
  emitBubbleNotification?: EmitAskHumanBubbleNotificationPort | undefined;
  resolveDeliveryMessageRef?:
    | ResolveDeliveryMessageRefPort
    | undefined;
  emitBubbleLifecycleEventBestEffort?:
    | EmitBubbleLifecycleEventBestEffortPort
    | undefined;
}

export interface AskHumanFinalizationDependencies {
  emitDeliveryNotificationAck: EmitDeliveryNotificationAckPort;
  emitBubbleNotification: EmitAskHumanBubbleNotificationPort;
  resolveDeliveryMessageRef: ResolveDeliveryMessageRefPort;
  emitBubbleLifecycleEventBestEffort: EmitBubbleLifecycleEventBestEffortPort;
}
