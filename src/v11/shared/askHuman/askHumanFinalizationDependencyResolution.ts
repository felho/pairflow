import { emitBubbleLifecycleEventBestEffort } from "../../../core/metrics/bubbleEvents.js";
import { emitBubbleNotification } from "../../../core/runtime/notifications.js";
import {
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
