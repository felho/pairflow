import type { MetaReviewRecommendation } from "../../../types/bubble.js";

export interface MetaReviewRunnerOutput {
  recommendation: MetaReviewRecommendation;
  summary?: string;
  rework_target_message?: string | null;
  report_json?: Record<string, unknown>;
}
