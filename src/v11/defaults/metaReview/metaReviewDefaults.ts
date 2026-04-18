import {
  emitDeliveryNotificationAck,
  resolveDeliveryMessageRef
} from "../../infrastructure/channel/tmux/tmuxDelivery.js";

export const metaReviewDefaults = {
  emitDeliveryNotificationAck,
  resolveDeliveryMessageRef
} as const;
