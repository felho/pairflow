import {
  emitDeliveryNotificationAck,
  resolveDeliveryMessageRef
} from "../../infrastructure/channel/tmux/tmuxDelivery.js";
import { refreshReviewerContext } from "../../infrastructure/channel/tmux/reviewerContext.js";
import {
  readReviewerBriefArtifact,
  readReviewerFocusArtifact
} from "./reviewerArtifactDefaults.js";

export const reviewerDeliveryDefaults = {
  emitDeliveryNotificationAck,
  readReviewerBriefArtifact,
  readReviewerFocusArtifact,
  refreshReviewerContext,
  resolveDeliveryMessageRef
} as const;
