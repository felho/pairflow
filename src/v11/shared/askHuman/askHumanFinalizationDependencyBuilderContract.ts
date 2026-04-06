import type { emitBubbleLifecycleEventBestEffort } from "../../../core/metrics/bubbleEvents.js";
import type { emitBubbleNotification } from "../../infrastructure/channel/notifications.js";
import type {
  emitTmuxDeliveryNotification,
  resolveDeliveryMessageRef
} from "../../infrastructure/channel/tmux/tmuxDelivery.js";

export interface AskHumanFinalizationDependencySource {
  emitTmuxDeliveryNotification?: typeof emitTmuxDeliveryNotification | undefined;
  emitBubbleNotification?: typeof emitBubbleNotification | undefined;
  resolveDeliveryMessageRef?: typeof resolveDeliveryMessageRef | undefined;
  emitBubbleLifecycleEventBestEffort?:
    | typeof emitBubbleLifecycleEventBestEffort
    | undefined;
}

export interface AskHumanFinalizationDependencies {
  emitTmuxDeliveryNotification?: typeof emitTmuxDeliveryNotification;
  emitBubbleNotification?: typeof emitBubbleNotification;
  resolveDeliveryMessageRef?: typeof resolveDeliveryMessageRef;
  emitBubbleLifecycleEventBestEffort?: typeof emitBubbleLifecycleEventBestEffort;
}
