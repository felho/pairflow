import type { FinalizeAskHumanFlowDependencies } from "./askHumanFlowContract.js";
import type { ResolveAskHumanFinalizationDependenciesInput } from "./askHumanFinalizationDependencyResolutionContract.js";

export function buildAskHumanFinalizationDependencyResolutionInput(
  dependencies: FinalizeAskHumanFlowDependencies
): ResolveAskHumanFinalizationDependenciesInput {
  return {
    emitDeliveryNotificationAck:
      dependencies.emitDeliveryNotificationAck
      ?? dependencies.emitTmuxDeliveryNotification,
    emitBubbleNotification: dependencies.emitBubbleNotification,
    resolveDeliveryMessageRef: dependencies.resolveDeliveryMessageRef,
    emitBubbleLifecycleEventBestEffort:
      dependencies.emitBubbleLifecycleEventBestEffort
  };
}
