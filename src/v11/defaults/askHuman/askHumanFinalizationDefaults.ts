import { emitBubbleNotification } from "../../infrastructure/channel/notifications.js";
import { emitTmuxDeliveryNotification } from "../../infrastructure/channel/tmux/tmuxDelivery.js";

export const askHumanFinalizationDefaults = {
  emitTmuxDeliveryNotification,
  emitBubbleNotification
} as const;
