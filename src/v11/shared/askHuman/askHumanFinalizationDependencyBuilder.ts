import type {
  AskHumanFinalizationDependencies,
  AskHumanFinalizationDependencySource
} from "./askHumanFinalizationDependencyBuilderContract.js";
import { askHumanFinalizationDependencyDefaults } from "./askHumanFinalizationDependencyDefaults.js";

export function buildAskHumanFinalizationDependencies(
  dependencies: AskHumanFinalizationDependencySource
): AskHumanFinalizationDependencies {
  return {
    ...(dependencies.emitTmuxDeliveryNotification !== undefined
      ? { emitTmuxDeliveryNotification: dependencies.emitTmuxDeliveryNotification }
      : {
          emitTmuxDeliveryNotification:
            askHumanFinalizationDependencyDefaults.emitTmuxDeliveryNotification
        }),
    ...(dependencies.emitBubbleNotification !== undefined
      ? { emitBubbleNotification: dependencies.emitBubbleNotification }
      : {
          emitBubbleNotification:
            askHumanFinalizationDependencyDefaults.emitBubbleNotification
        }),
    ...(dependencies.resolveDeliveryMessageRef !== undefined
      ? { resolveDeliveryMessageRef: dependencies.resolveDeliveryMessageRef }
      : {}),
    ...(dependencies.emitBubbleLifecycleEventBestEffort !== undefined
      ? { emitBubbleLifecycleEventBestEffort: dependencies.emitBubbleLifecycleEventBestEffort }
      : {
          emitBubbleLifecycleEventBestEffort:
            askHumanFinalizationDependencyDefaults.emitBubbleLifecycleEventBestEffort
        })
  };
}
