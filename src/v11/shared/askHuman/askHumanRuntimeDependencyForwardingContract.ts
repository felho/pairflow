import type { emitBubbleNotification } from "../../infrastructure/channel/notifications.js";
import type { emitTmuxDeliveryNotification } from "../../infrastructure/channel/tmux/tmuxDelivery.js";

export interface AskHumanRuntimeNotificationDependencies {
  emitTmuxDeliveryNotification?: typeof emitTmuxDeliveryNotification | undefined;
  emitBubbleNotification?: typeof emitBubbleNotification | undefined;
}

export interface ForwardedAskHumanRuntimeNotificationDependencies {
  emitTmuxDeliveryNotification?: typeof emitTmuxDeliveryNotification | undefined;
  emitBubbleNotification?: typeof emitBubbleNotification | undefined;
}
