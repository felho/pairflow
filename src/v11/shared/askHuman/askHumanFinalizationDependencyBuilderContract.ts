import type { emitBubbleLifecycleEventBestEffort } from "../../../v11/shared/metrics/bubbleEvents.js";
import type {
  EmitAskHumanBubbleNotificationPort,
  EmitAskHumanDeliveryNotificationAckPort,
  EmitAskHumanTmuxDeliveryNotificationPort,
  ResolveAskHumanDeliveryMessageRefPort
} from "./askHumanDeliveryPortsContract.js";

export interface AskHumanFinalizationDependencySource {
  emitDeliveryNotificationAck?:
    | EmitAskHumanDeliveryNotificationAckPort
    | undefined;
  emitTmuxDeliveryNotification?:
    | EmitAskHumanTmuxDeliveryNotificationPort
    | undefined;
  emitBubbleNotification?: EmitAskHumanBubbleNotificationPort | undefined;
  resolveDeliveryMessageRef?:
    | ResolveAskHumanDeliveryMessageRefPort
    | undefined;
  emitBubbleLifecycleEventBestEffort?:
    | typeof emitBubbleLifecycleEventBestEffort
    | undefined;
}

export interface AskHumanFinalizationDependencies {
  emitDeliveryNotificationAck: EmitAskHumanDeliveryNotificationAckPort;
  emitBubbleNotification: EmitAskHumanBubbleNotificationPort;
  resolveDeliveryMessageRef: ResolveAskHumanDeliveryMessageRefPort;
  emitBubbleLifecycleEventBestEffort: typeof emitBubbleLifecycleEventBestEffort;
}
