import type {
  AskHumanFinalizationDependencies,
  AskHumanFinalizationDependencySource
} from "../../shared/askHuman/askHumanFinalizationDependencyBuilderContract.js";
import { askHumanFinalizationDependencyDefaults } from "./askHumanFinalizationDependencyDefaults.js";

export function buildAskHumanFinalizationDependencies(
  dependencies: AskHumanFinalizationDependencySource
): AskHumanFinalizationDependencies {
  const emitDeliveryNotificationAck =
    dependencies.emitDeliveryNotificationAck
    ?? askHumanFinalizationDependencyDefaults.emitDeliveryNotificationAck;
  const resolveDeliveryMessageRef =
    dependencies.resolveDeliveryMessageRef
    ?? askHumanFinalizationDependencyDefaults.resolveDeliveryMessageRef;

  return {
    emitDeliveryNotificationAck,
    ...(dependencies.emitBubbleNotification !== undefined
      ? { emitBubbleNotification: dependencies.emitBubbleNotification }
      : {
          emitBubbleNotification:
            askHumanFinalizationDependencyDefaults.emitBubbleNotification
        }),
    resolveDeliveryMessageRef,
    ...(dependencies.emitBubbleLifecycleEventBestEffort !== undefined
      ? { emitBubbleLifecycleEventBestEffort: dependencies.emitBubbleLifecycleEventBestEffort }
      : {
          emitBubbleLifecycleEventBestEffort:
            askHumanFinalizationDependencyDefaults.emitBubbleLifecycleEventBestEffort
        })
  };
}
