import type {
  LocalOverlayMode,
  QualityMode,
  ReviewArtifactType,
  ReviewerContextMode,
  WorkMode
} from "../types/bubble.js";

export const DEFAULT_WORK_MODE: WorkMode = "worktree";
export const DEFAULT_QUALITY_MODE: QualityMode = "strict";
export const DEFAULT_REVIEW_ARTIFACT_TYPE: ReviewArtifactType = "auto";
export const DEFAULT_REVIEWER_CONTEXT_MODE: ReviewerContextMode = "fresh";
export const DEFAULT_WATCHDOG_TIMEOUT_MINUTES = 10;
export const DEFAULT_MAX_ROUNDS = 8;
export const DEFAULT_COMMIT_REQUIRES_APPROVAL = true;
export const DEFAULT_LOCAL_OVERLAY_ENABLED = true;
export const DEFAULT_LOCAL_OVERLAY_MODE: LocalOverlayMode = "symlink";
export const DEFAULT_LOCAL_OVERLAY_ENTRIES = [
  ".claude",
  ".mcp.json",
  ".env.local",
  ".env.production"
] as const;
