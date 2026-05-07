import {
  emitDeliveryNotificationAck,
  resolveDeliveryMessageRef
} from "../../infrastructure/channel/tmux/tmuxDelivery.js";
import { refreshReviewerContext } from "../../infrastructure/channel/tmux/reviewerContext.js";
import {
  readReviewerBriefArtifact,
  readReviewerFocusArtifact
} from "./reviewerArtifactDefaults.js";
import {
  resolveReviewerTestExecutionDirectiveFromArtifact,
  verifyImplementerTestEvidence,
  writeReviewerTestEvidenceArtifact
} from "./reviewerTestEvidenceDefaults.js";

export const reviewerDeliveryDefaults = {
  emitDeliveryNotificationAck,
  readReviewerBriefArtifact,
  readReviewerFocusArtifact,
  resolveReviewerTestExecutionDirectiveFromArtifact,
  refreshReviewerContext,
  resolveDeliveryMessageRef,
  verifyImplementerTestEvidence,
  writeReviewerTestEvidenceArtifact
} as const;
