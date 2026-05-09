import type {
  MetaReviewRecommendation,
  MetaReviewRunStatus
} from "../../../../shared/metaReview/metaReviewTypes.js";
import { isNonEmptyString } from "../../../../shared/validation/primitives.js";
import { MetaReviewError } from "../../../../shared/metaReview/metaReviewError.js";

export type SubmitRunStatus = "success";

export function resolveSubmitRunStatus(): SubmitRunStatus {
  return "success";
}

export function assertSubmitStatusIsSuccess(
  status: MetaReviewRunStatus
): asserts status is SubmitRunStatus {
  if (status !== "success") {
    throw new MetaReviewError({
      reasonCode: "META_REVIEW_SCHEMA_INVALID_COMBINATION",
      message:
        "meta-review submit only accepts status=success; recommendation carries the routed outcome semantics",
      context: {
        source: "meta_review_command_submit_validation",
        reason: "submit_status_must_be_success"
      }
    });
  }
}

export function assertSubmitPayloadInvariants(input: {
  recommendation: MetaReviewRecommendation;
  reworkTargetMessage: string | null;
}): void {
  if (
    input.recommendation === "rework" &&
    !isNonEmptyString(input.reworkTargetMessage)
  ) {
    throw new MetaReviewError({
      reasonCode: "META_REVIEW_REWORK_MESSAGE_INVALID",
      message:
        "meta-review run requires a non-empty rework target message when recommendation is rework",
      context: {
        source: "meta_review_command_submit_validation",
        reason: "rework_target_message_missing_for_rework"
      }
    });
  }
  if (
    input.recommendation !== "rework" &&
    input.reworkTargetMessage !== null &&
    !isNonEmptyString(input.reworkTargetMessage)
  ) {
    throw new MetaReviewError({
      reasonCode: "META_REVIEW_REWORK_MESSAGE_INVALID",
      message:
        "meta-review run advisory rework target message must be non-empty when provided",
      context: {
        source: "meta_review_command_submit_validation",
        reason: "advisory_rework_target_message_invalid"
      }
    });
  }
}

export function normalizeRequiredSubmitText(
  value: string,
  fieldName: "summary"
): string {
  if (!isNonEmptyString(value)) {
    throw new MetaReviewError({
      reasonCode: "META_REVIEW_SCHEMA_INVALID",
      message: `meta-review submit ${fieldName} must be a non-empty string`,
      context: {
        source: "meta_review_command_submit_validation",
        reason: `${fieldName}_must_be_non_empty`
      }
    });
  }
  return value.trim();
}
