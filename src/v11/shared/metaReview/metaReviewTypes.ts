export const metaReviewRunStatuses = [
  "success",
  "error",
  "inconclusive"
] as const;

export type MetaReviewRunStatus = (typeof metaReviewRunStatuses)[number];

export const metaReviewRecommendations = [
  "rework",
  "approve",
  "inconclusive"
] as const;

export type MetaReviewRecommendation =
  (typeof metaReviewRecommendations)[number];

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

export function isMetaReviewRunStatus(
  value: unknown
): value is MetaReviewRunStatus {
  return (
    typeof value === "string" &&
    (metaReviewRunStatuses as readonly string[]).includes(value)
  );
}

export function isMetaReviewRecommendation(
  value: unknown
): value is MetaReviewRecommendation {
  return (
    typeof value === "string" &&
    (metaReviewRecommendations as readonly string[]).includes(value)
  );
}
