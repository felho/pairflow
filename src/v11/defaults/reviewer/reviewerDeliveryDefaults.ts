import {
  emitTmuxDeliveryNotification,
  resolveDeliveryMessageRef
} from "../../infrastructure/channel/tmux/tmuxDelivery.js";
import { refreshReviewerContext } from "../../infrastructure/channel/tmux/reviewerContext.js";

export const reviewerDeliveryDefaults = {
  emitTmuxDeliveryNotification,
  refreshReviewerContext,
  resolveDeliveryMessageRef
} as const;
