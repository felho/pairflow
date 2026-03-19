import { emitBubbleNotification } from "../../../core/runtime/notifications.js";
import {
  emitTmuxDeliveryNotification
} from "../../../core/runtime/tmuxDelivery.js";
import {
  emitBubbleLifecycleEventBestEffort
} from "../../../core/metrics/bubbleEvents.js";
import type {
  AskHumanFinalizationDependencies,
  AskHumanFinalizationDependencySource
} from "./askHumanFinalizationDependencyBuilderContract.js";

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
