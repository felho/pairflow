import {
  emitTmuxDeliveryNotification,
  resolveDeliveryMessageRef
} from "./tmuxDelivery.js";

export const metaReviewDefaults = {
  emitTmuxDeliveryNotification,
  resolveDeliveryMessageRef
} as const;
