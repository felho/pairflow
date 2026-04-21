import type {
  ResolvedAskHumanFinalizationDependencies,
  ResolveAskHumanFinalizationDependenciesInput
} from "../../shared/askHuman/askHumanFinalizationDependencyResolutionContract.js";
import { askHumanFinalizationDependencyDefaults } from "./askHumanFinalizationDependencyDefaults.js";

export function resolveAskHumanFinalizationDependencies(
  input: ResolveAskHumanFinalizationDependenciesInput
): ResolvedAskHumanFinalizationDependencies {
  return {
    emitDeliveryNotificationAck:
      input.emitDeliveryNotificationAck
      ?? askHumanFinalizationDependencyDefaults.emitDeliveryNotificationAck,
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
