import type { MetaReviewRecommendation } from "../../../types/bubble.js";

export interface MetaReviewReviewerVerdict {
  recommendation: MetaReviewRecommendation;
  summary: string;
  rework_target_message: string | null;
}
