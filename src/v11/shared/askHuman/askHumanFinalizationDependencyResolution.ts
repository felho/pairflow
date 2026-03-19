import { emitBubbleLifecycleEventBestEffort } from "../../../core/metrics/bubbleEvents.js";
import { emitBubbleNotification } from "../../../core/runtime/notifications.js";
import {
  emitTmuxDeliveryNotification,
  resolveDeliveryMessageRef
} from "../../../core/runtime/tmuxDelivery.js";
import type {
  ResolvedAskHumanFinalizationDependencies,
  ResolveAskHumanFinalizationDependenciesInput
} from "./askHumanFinalizationDependencyResolutionContract.js";

export function resolveAskHumanFinalizationDependencies(
  input: ResolveAskHumanFinalizationDependenciesInput
): ResolvedAskHumanFinalizationDependencies {
  return {
    emitTmuxDeliveryNotification:
      input.emitTmuxDeliveryNotification ?? emitTmuxDeliveryNotification,
    emitBubbleNotification: input.emitBubbleNotification ?? emitBubbleNotification,
    resolveDeliveryMessageRef:
      input.resolveDeliveryMessageRef ?? resolveDeliveryMessageRef,
    emitBubbleLifecycleEventBestEffort:
      input.emitBubbleLifecycleEventBestEffort ??
      emitBubbleLifecycleEventBestEffort
  };
}
