import type {
  AskHumanRuntimeNotificationDependencies,
  ForwardedAskHumanRuntimeNotificationDependencies
} from "./askHumanRuntimeDependencyForwardingContract.js";

export function forwardAskHumanRuntimeNotificationDependencies(
  dependencies: AskHumanRuntimeNotificationDependencies
): ForwardedAskHumanRuntimeNotificationDependencies {
  return {
    ...(dependencies.emitDeliveryNotificationAck !== undefined
      ? {
          emitDeliveryNotificationAck:
            dependencies.emitDeliveryNotificationAck
        }
      : {}),
    ...(dependencies.emitBubbleNotification !== undefined
      ? { emitBubbleNotification: dependencies.emitBubbleNotification }
      : {}),
    ...(dependencies.resolveDeliveryMessageRef !== undefined
      ? { resolveDeliveryMessageRef: dependencies.resolveDeliveryMessageRef }
      : {}),
    ...(dependencies.emitBubbleLifecycleEventBestEffort !== undefined
      ? {
          emitBubbleLifecycleEventBestEffort:
            dependencies.emitBubbleLifecycleEventBestEffort
        }
      : {})
  };
}
