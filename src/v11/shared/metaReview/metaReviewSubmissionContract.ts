import type {
  MetaReviewRecommendation
} from "./metaReviewTypes.js";

export interface MetaReviewSubmissionPayload {
  bubble_id: string;
  round: number;
  recommendation: MetaReviewRecommendation;
  summary: string;
  rework_target_message?: string | null;
  report_json: Record<string, unknown>;
}
