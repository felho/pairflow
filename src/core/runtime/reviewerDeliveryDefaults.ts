import {
  emitTmuxDeliveryNotification,
  resolveDeliveryMessageRef
} from "./tmuxDelivery.js";
import { refreshReviewerContext } from "./reviewerContext.js";

export const reviewerDeliveryDefaults = {
  emitTmuxDeliveryNotification,
  refreshReviewerContext,
  resolveDeliveryMessageRef
} as const;
