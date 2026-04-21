import {
  emitDeliveryNotificationAck,
  resolveDeliveryMessageRef
} from "../../infrastructure/channel/tmux/tmuxDelivery.js";
import { refreshReviewerContext } from "../../infrastructure/channel/tmux/reviewerContext.js";

export const reviewerDeliveryDefaults = {
  emitDeliveryNotificationAck,
  refreshReviewerContext,
  resolveDeliveryMessageRef
} as const;
