import {
  emitTmuxDeliveryNotification,
  resolveDeliveryMessageRef
} from "../../infrastructure/channel/tmux/tmuxDelivery.js";

export const metaReviewDefaults = {
  emitTmuxDeliveryNotification,
  resolveDeliveryMessageRef
} as const;
