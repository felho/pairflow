import type { MetaReviewRunResult, MetaReviewRunWarning } from "../../../core/bubble/metaReview.js";

export const metaReviewFallbackReportRef = "artifacts/meta-review-last.json";

export function buildMetaReviewArtifactWriteWarning(input: {
  artifactRef: string;
  error: unknown;
}): MetaReviewRunWarning {
  return {
    reason_code: "META_REVIEW_ARTIFACT_WRITE_WARNING",
    message: `${input.artifactRef}: ${input.error instanceof Error ? input.error.message : String(input.error)}`
  };
}

export function buildRecoveredMetaReviewReportPayload(input: {
  bubbleId: string;
  round: number;
  nowIso: string;
  runResult: MetaReviewRunResult;
  recoveredWarnings: MetaReviewRunWarning[];
}): {
  bubble_id: string;
  round: number;
  generated_at: string;
  status: MetaReviewRunResult["status"];
  recommendation: MetaReviewRunResult["recommendation"];
  summary: MetaReviewRunResult["summary"];
  report_ref: MetaReviewRunResult["report_ref"];
  report_json_ref: string;
  warnings: MetaReviewRunWarning[];
  run_id?: string;
  rework_target_message: MetaReviewRunResult["rework_target_message"];
  lifecycle_state: MetaReviewRunResult["lifecycle_state"];
  report_json?: MetaReviewRunResult["report_json"];
} {
  return {
    bubble_id: input.bubbleId,
    round: input.round,
    generated_at: input.nowIso,
    status: input.runResult.status,
    recommendation: input.runResult.recommendation,
    summary: input.runResult.summary,
    report_ref: input.runResult.report_ref,
    report_json_ref: input.runResult.report_ref,
    warnings: [
      ...input.runResult.warnings,
      ...input.recoveredWarnings
    ],
    ...(input.runResult.run_id !== undefined
      ? { run_id: input.runResult.run_id }
      : {}),
    rework_target_message: input.runResult.rework_target_message,
    lifecycle_state: input.runResult.lifecycle_state,
    ...(input.runResult.report_json !== undefined
      ? { report_json: input.runResult.report_json }
      : {})
  };
}
