import { emitBubbleLifecycleEventBestEffort } from "../../../v11/shared/metrics/bubbleEvents.js";
import { emitBubbleNotification } from "../../../core/runtime/notifications.js";
import {
  emitTmuxDeliveryNotification,
  resolveDeliveryMessageRef
} from "../../../core/runtime/tmuxDelivery.js";

export const askHumanFinalizationDependencyDefaults = {
  emitTmuxDeliveryNotification,
  emitBubbleNotification,
  resolveDeliveryMessageRef,
  emitBubbleLifecycleEventBestEffort
} as const;
