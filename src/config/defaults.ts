import type {
  QualityMode,
  ReviewerContextMode,
  WorkMode
} from "../types/bubble.js";

export const DEFAULT_WORK_MODE: WorkMode = "worktree";
export const DEFAULT_QUALITY_MODE: QualityMode = "strict";
export const DEFAULT_REVIEWER_CONTEXT_MODE: ReviewerContextMode = "fresh";
export const DEFAULT_WATCHDOG_TIMEOUT_MINUTES = 5;
export const DEFAULT_MAX_ROUNDS = 8;
export const DEFAULT_COMMIT_REQUIRES_APPROVAL = true;
