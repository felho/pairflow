import { emitBubbleNotification } from "../../../core/runtime/notifications.js";
import {
  emitTmuxDeliveryNotification
} from "../../../core/runtime/tmuxDelivery.js";
import type {
  resolveDeliveryMessageRef
} from "../../../core/runtime/tmuxDelivery.js";
import {
  emitBubbleLifecycleEventBestEffort
} from "../../../core/metrics/bubbleEvents.js";

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

export function buildAskHumanFinalizationDependencies(
  dependencies: AskHumanFinalizationDependencySource
): AskHumanFinalizationDependencies {
  return {
    ...(dependencies.emitTmuxDeliveryNotification !== undefined
      ? { emitTmuxDeliveryNotification: dependencies.emitTmuxDeliveryNotification }
      : { emitTmuxDeliveryNotification }),
    ...(dependencies.emitBubbleNotification !== undefined
      ? { emitBubbleNotification: dependencies.emitBubbleNotification }
      : { emitBubbleNotification }),
    ...(dependencies.resolveDeliveryMessageRef !== undefined
      ? { resolveDeliveryMessageRef: dependencies.resolveDeliveryMessageRef }
      : {}),
    ...(dependencies.emitBubbleLifecycleEventBestEffort !== undefined
      ? { emitBubbleLifecycleEventBestEffort: dependencies.emitBubbleLifecycleEventBestEffort }
      : { emitBubbleLifecycleEventBestEffort })
  };
}
