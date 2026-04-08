import {
  isNonEmptyString
} from "../../validation/primitives.js";
import { MetaReviewError } from "../metaReviewError.js";
import type {
  MetaReviewRecommendation,
  MetaReviewRunStatus
} from "../../../../types/bubble.js";

export function shouldRefreshApprovalRequest(state: string): boolean {
  return state === "READY_FOR_HUMAN_APPROVAL";
}

export function mapRecommendationToStatus(
  recommendation: MetaReviewRecommendation
): MetaReviewRunStatus {
  if (recommendation === "inconclusive") {
    return "inconclusive";
  }

  return "success";
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
        source: "meta_review_live_run_errors",
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
        source: "meta_review_live_run_errors",
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
        source: "meta_review_live_run_errors",
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
        source: "meta_review_live_run_errors",
        reason: "non_inconclusive_recommendation_with_error_status"
      }
    });
  }
}

export function stateWriteConflictToMetaReviewError(error: unknown): MetaReviewError {
  const reason = error instanceof Error ? error.message : String(error);
  return new MetaReviewError(
    "META_REVIEW_SNAPSHOT_WRITE_CONFLICT",
    `Failed to persist meta-review snapshot due to concurrent update. ${reason}`
  );
}

export function formatRunnerFailure(error: unknown): {
  summary: string;
  warningMessage: string;
} {
  if (error instanceof MetaReviewError) {
    return {
      summary: `Meta-review runner failure (${error.reasonCode}): ${error.message}`,
      warningMessage: `${error.reasonCode}: ${error.message}`
    };
  }

  const reason = error instanceof Error ? error.message : String(error);
  return {
    summary: `Meta-review runner failure: ${reason}`,
    warningMessage: reason
  };
}

export function isMissingFileError(error: unknown): boolean {
  return (
    error instanceof Error &&
    "code" in error &&
    (error as NodeJS.ErrnoException).code === "ENOENT"
  );
}
