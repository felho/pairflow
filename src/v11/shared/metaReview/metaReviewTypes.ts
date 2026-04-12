import type {
  MetaReviewRecommendation,
  MetaReviewRunStatus
} from "../../../types/bubble.js";

export interface MetaReviewRunWarning {
  reason_code: string;
  message: string;
}

export interface MetaReviewResult {
  bubble_id: string;
  run_id?: string;
  status: MetaReviewRunStatus;
  recommendation: MetaReviewRecommendation;
  summary: string | null;
  rework_target_message: string | null;
  updated_at: string;
  warnings: MetaReviewRunWarning[];
  report_json?: Record<string, unknown>;
}
