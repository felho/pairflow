import { MetaReviewError } from "../command/metaReviewError.js";
import type { MetaReviewRecommendation } from "../../metaReviewTypes.js";

function parseOptionalSubmitRunLinkField(
  value: unknown
): { status: "absent" } | { status: "valid"; value: string } | { status: "invalid" } {
  if (value === undefined || value === null) {
    return { status: "absent" };
  }
  if (typeof value !== "string") {
    return { status: "invalid" };
  }
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return { status: "invalid" };
  }
  return { status: "valid", value: trimmed };
}

export function resolveSubmitCanonicalRunId(input: {
  recommendation: MetaReviewRecommendation;
  reportJson: Record<string, unknown>;
  generatedRunId: string;
}): string {
  const reportJson = input.reportJson;
  const metaReviewRunId = parseOptionalSubmitRunLinkField(
    reportJson.meta_review_run_id
  );
  const findingsRunId = parseOptionalSubmitRunLinkField(
    reportJson.findings_run_id
  );

  if (metaReviewRunId.status === "invalid" || findingsRunId.status === "invalid") {
    throw new MetaReviewError({
      reasonCode: "META_REVIEW_SCHEMA_INVALID",
      message:
        "meta-review submit report_json run-link fields must be non-empty strings when provided",
      context: {
        source: "resolve_submit_canonical_run_id",
        reason: "invalid_run_link_field"
      }
    });
  }

  if (
    metaReviewRunId.status === "valid" &&
    findingsRunId.status === "valid" &&
    metaReviewRunId.value !== findingsRunId.value
  ) {
    throw new MetaReviewError({
      reasonCode: "META_REVIEW_SCHEMA_INVALID",
      message:
        "meta-review submit report_json run-link fields must match when both are provided",
      context: {
        source: "resolve_submit_canonical_run_id",
        reason: "mismatched_run_link_fields"
      }
    });
  }

  const providedRunId =
    metaReviewRunId.status === "valid"
      ? metaReviewRunId.value
      : findingsRunId.status === "valid"
        ? findingsRunId.value
        : null;

  if (input.recommendation === "rework" && providedRunId === null) {
    throw new MetaReviewError({
      reasonCode: "META_REVIEW_SCHEMA_INVALID",
      message:
        "meta-review submit recommendation=rework requires explicit report_json meta_review_run_id/findings_run_id linkage",
      context: {
        source: "resolve_submit_canonical_run_id",
        reason: "missing_rework_run_link"
      }
    });
  }

  return providedRunId ?? input.generatedRunId;
}
