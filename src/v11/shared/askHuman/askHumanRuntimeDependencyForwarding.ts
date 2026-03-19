import type {
  AskHumanRuntimeNotificationDependencies,
  ForwardedAskHumanRuntimeNotificationDependencies
} from "./askHumanRuntimeDependencyForwardingContract.js";

export function forwardAskHumanRuntimeNotificationDependencies(
  dependencies: AskHumanRuntimeNotificationDependencies
): ForwardedAskHumanRuntimeNotificationDependencies {
  return {
    ...(dependencies.emitTmuxDeliveryNotification !== undefined
      ? {
          emitTmuxDeliveryNotification:
            dependencies.emitTmuxDeliveryNotification
        }
      : {}),
    ...(dependencies.emitBubbleNotification !== undefined
      ? { emitBubbleNotification: dependencies.emitBubbleNotification }
      : {})
  };
}
