import type { MetaReviewRecommendation } from "../../../types/bubble.js";
import type { MetaReviewReviewerVerdict } from "../../domain/metaReview/metaReviewReviewerVerdict.js";

export interface MetaReviewRunnerOutput extends MetaReviewReviewerVerdict {
  report_json?: Record<string, unknown>;
}

export interface MetaReviewLiveRunnerOutputBridge {
  recommendation: MetaReviewRecommendation;
  summary?: string;
  rework_target_message?: string | null;
  report_json?: Record<string, unknown>;
}
