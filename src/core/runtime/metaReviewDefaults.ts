import {
  emitTmuxDeliveryNotification,
  resolveDeliveryMessageRef
} from "../../v11/infrastructure/channel/tmux/tmuxDelivery.js";

export const metaReviewDefaults = {
  emitTmuxDeliveryNotification,
  resolveDeliveryMessageRef
} as const;
