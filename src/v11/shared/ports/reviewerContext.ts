import type { BubbleConfig } from "../../../types/bubble.js";

export interface RefreshReviewerContextInput {
  bubbleId: string;
  bubbleConfig: BubbleConfig;
  sessionsPath: string;
  reviewerStartupPrompt?: string;
}

export type RefreshReviewerContextFailureReason =
  | "no_runtime_session"
  | "registry_read_failed"
  | "tmux_respawn_failed";

export interface RefreshReviewerContextResult {
  refreshed: boolean;
  reason?: RefreshReviewerContextFailureReason;
}

export type RefreshReviewerContextPort = (
  input: RefreshReviewerContextInput
) => Promise<RefreshReviewerContextResult>;
