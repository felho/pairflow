import type { emitBubbleLifecycleEventBestEffort } from "../../../core/metrics/bubbleEvents.js";
import type { emitBubbleNotification } from "../../../core/runtime/notifications.js";
import type {
  emitTmuxDeliveryNotification,
  resolveDeliveryMessageRef
} from "../../../core/runtime/tmuxDelivery.js";

export interface ResolveAskHumanFinalizationDependenciesInput {
  emitTmuxDeliveryNotification?: typeof emitTmuxDeliveryNotification | undefined;
  emitBubbleNotification?: typeof emitBubbleNotification | undefined;
  resolveDeliveryMessageRef?: typeof resolveDeliveryMessageRef | undefined;
  emitBubbleLifecycleEventBestEffort?:
    | typeof emitBubbleLifecycleEventBestEffort
    | undefined;
}

export interface ResolvedAskHumanFinalizationDependencies {
  emitTmuxDeliveryNotification: typeof emitTmuxDeliveryNotification;
  emitBubbleNotification: typeof emitBubbleNotification;
  resolveDeliveryMessageRef: typeof resolveDeliveryMessageRef;
  emitBubbleLifecycleEventBestEffort: typeof emitBubbleLifecycleEventBestEffort;
}
