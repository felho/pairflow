import type {
  MetaReviewRecommendation,
  MetaReviewRunStatus
} from "../../../types/bubble.js";

export type MetaReviewDepth = "standard" | "deep";

export interface MetaReviewRunWarning {
  reason_code:
    | "META_REVIEW_RUNNER_ERROR"
    | "META_REVIEW_ARTIFACT_WRITE_WARNING"
    | "META_REVIEWER_PANE_UNAVAILABLE";
  message: string;
}

export interface MetaReviewResult {
  bubble_id: string;
  run_id?: string;
  status: MetaReviewRunStatus;
  recommendation: MetaReviewRecommendation;
  summary: string | null;
  report_ref: string;
  rework_target_message: string | null;
  updated_at: string;
  warnings: MetaReviewRunWarning[];
  report_json?: Record<string, unknown>;
}
