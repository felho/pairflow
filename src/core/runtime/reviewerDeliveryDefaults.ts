import {
  emitTmuxDeliveryNotification,
  resolveDeliveryMessageRef
} from "../../v11/infrastructure/channel/tmux/tmuxDelivery.js";
import { refreshReviewerContext } from "../../v11/infrastructure/channel/tmux/reviewerContext.js";

export const reviewerDeliveryDefaults = {
  emitTmuxDeliveryNotification,
  refreshReviewerContext,
  resolveDeliveryMessageRef
} as const;
