import type {
  EmitAskHumanBubbleNotificationPort
} from "./askHumanDeliveryPortsContract.js";
import type {
  EmitDeliveryNotificationAckPort,
  ResolveDeliveryMessageRefPort
} from "../../ports/tmuxDelivery.js";
import type { EmitBubbleLifecycleEventBestEffortPort } from "../../shared/metrics/bubbleEvents.js";

export interface AskHumanRuntimeNotificationDependencies {
  emitDeliveryNotificationAck?:
    | EmitDeliveryNotificationAckPort
    | undefined;
  emitBubbleNotification?: EmitAskHumanBubbleNotificationPort | undefined;
  resolveDeliveryMessageRef?: ResolveDeliveryMessageRefPort | undefined;
  emitBubbleLifecycleEventBestEffort?:
    | EmitBubbleLifecycleEventBestEffortPort
    | undefined;
}

export interface ForwardedAskHumanRuntimeNotificationDependencies {
  emitDeliveryNotificationAck?:
    | EmitDeliveryNotificationAckPort
    | undefined;
  emitBubbleNotification?: EmitAskHumanBubbleNotificationPort | undefined;
  resolveDeliveryMessageRef?: ResolveDeliveryMessageRefPort | undefined;
  emitBubbleLifecycleEventBestEffort?:
    | EmitBubbleLifecycleEventBestEffortPort
    | undefined;
}
