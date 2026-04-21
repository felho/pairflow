import type {
  AskHumanRuntimeNotificationDependencies,
  ForwardedAskHumanRuntimeNotificationDependencies
} from "./askHumanRuntimeDependencyForwardingContract.js";

export function forwardAskHumanRuntimeNotificationDependencies(
  dependencies: AskHumanRuntimeNotificationDependencies
): ForwardedAskHumanRuntimeNotificationDependencies {
  const emitDeliveryNotificationAck =
    dependencies.emitDeliveryNotificationAck
    ?? dependencies.emitTmuxDeliveryNotification;

  return {
    ...(emitDeliveryNotificationAck !== undefined
      ? {
          emitDeliveryNotificationAck
        }
      : {}),
    ...(dependencies.emitBubbleNotification !== undefined
      ? { emitBubbleNotification: dependencies.emitBubbleNotification }
      : {})
  };
}
