import { emitBubbleLifecycleEventBestEffort } from "../../../core/metrics/bubbleEvents.js";
import { emitBubbleNotification } from "../../infrastructure/channel/notifications.js";
import {
  emitTmuxDeliveryNotification,
  resolveDeliveryMessageRef
} from "../../infrastructure/channel/tmux/tmuxDelivery.js";

export const askHumanFinalizationDependencyDefaults = {
  emitTmuxDeliveryNotification,
  emitBubbleNotification,
  resolveDeliveryMessageRef,
  emitBubbleLifecycleEventBestEffort
} as const;
