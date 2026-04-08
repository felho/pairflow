import { isNonEmptyString } from "../validation/primitives.js";
import { MetaReviewError } from "./metaReviewError.js";
import type {
  MetaReviewRecommendation,
  MetaReviewRunStatus
} from "../../../types/bubble.js";

export function mapRecommendationToStatus(
  recommendation: MetaReviewRecommendation
): MetaReviewRunStatus {
  return recommendation === "inconclusive" ? "inconclusive" : "success";
}

export function assertRunPayloadInvariants(input: {
  recommendation: MetaReviewRecommendation;
  status: MetaReviewRunStatus;
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

  if (
    (input.recommendation === "rework" || input.recommendation === "approve") &&
    input.status !== "success"
  ) {
    throw new MetaReviewError({
      reasonCode: "META_REVIEW_SCHEMA_INVALID_COMBINATION",
      message: "invalid meta-review status/recommendation combination",
      context: {
        source: "meta_review_command_submit_validation",
        reason: "success_recommendation_without_success_status"
      }
    });
  }

  if (
    (input.status === "error" || input.status === "inconclusive") &&
    input.recommendation !== "inconclusive"
  ) {
    throw new MetaReviewError({
      reasonCode: "META_REVIEW_SCHEMA_INVALID_COMBINATION",
      message: "invalid meta-review status/recommendation combination",
      context: {
        source: "meta_review_command_submit_validation",
        reason: "non_inconclusive_recommendation_with_error_status"
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
