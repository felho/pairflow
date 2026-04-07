import type {
  ResolvedAskHumanFinalizationDependencies,
  ResolveAskHumanFinalizationDependenciesInput
} from "../../shared/askHuman/askHumanFinalizationDependencyResolutionContract.js";
import { askHumanFinalizationDependencyDefaults } from "./askHumanFinalizationDependencyDefaults.js";

export function resolveAskHumanFinalizationDependencies(
  input: ResolveAskHumanFinalizationDependenciesInput
): ResolvedAskHumanFinalizationDependencies {
  return {
    emitTmuxDeliveryNotification:
      input.emitTmuxDeliveryNotification
      ?? askHumanFinalizationDependencyDefaults.emitTmuxDeliveryNotification,
    emitBubbleNotification:
      input.emitBubbleNotification
      ?? askHumanFinalizationDependencyDefaults.emitBubbleNotification,
    resolveDeliveryMessageRef:
      input.resolveDeliveryMessageRef
      ?? askHumanFinalizationDependencyDefaults.resolveDeliveryMessageRef,
    emitBubbleLifecycleEventBestEffort:
      input.emitBubbleLifecycleEventBestEffort ??
      askHumanFinalizationDependencyDefaults.emitBubbleLifecycleEventBestEffort
  };
}
