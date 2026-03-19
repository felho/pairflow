import type { emitBubbleNotification } from "../../../core/runtime/notifications.js";
import type { emitTmuxDeliveryNotification } from "../../../core/runtime/tmuxDelivery.js";

export interface AskHumanRuntimeNotificationDependencies {
  emitTmuxDeliveryNotification?: typeof emitTmuxDeliveryNotification | undefined;
  emitBubbleNotification?: typeof emitBubbleNotification | undefined;
}

export interface ForwardedAskHumanRuntimeNotificationDependencies {
  emitTmuxDeliveryNotification?: typeof emitTmuxDeliveryNotification | undefined;
  emitBubbleNotification?: typeof emitBubbleNotification | undefined;
}

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
