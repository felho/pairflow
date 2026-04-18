import { emitBubbleNotification } from "../../infrastructure/channel/notifications.js";
import { emitDeliveryNotificationAck } from "../../infrastructure/channel/tmux/tmuxDelivery.js";

export const askHumanFinalizationDefaults = {
  emitDeliveryNotificationAck,
  emitBubbleNotification
} as const;
