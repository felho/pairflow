import {
  DEFAULT_REVIEW_POLICY_AUTO_REWORK_MIN_SEVERITY,
  DEFAULT_REVIEW_POLICY_LOOP_MODE,
  DEFAULT_REVIEW_POLICY_REVIEWER_BLOCKING_MIN_SEVERITY
} from "../defaults.js";
import type { BubbleConfig } from "../../types/bubble.js";
import {
  isBubbleReviewAutoReworkSeverity,
  isBubbleReviewLoopMode
} from "../../v11/shared/reviewPolicy/reviewPolicyTypes.js";
import {
  isInteger,
  type ValidationError
} from "../../v11/shared/validation/primitives.js";
import {
  REVIEW_POLICY_CONSECUTIVE_CLEAN_RUNS_REQUIRED_INVALID,
  REVIEW_POLICY_INVALID,
  REVIEW_POLICY_LOOP_MODE_INVALID,
  REVIEW_POLICY_THRESHOLD_INVALID
} from "./errors.js";

const allowedReviewPolicyKeys = new Set([
  "review_loop_mode",
  "reviewer_blocking_min_severity",
  "meta_review_auto_rework_min_severity",
  "meta_review_consecutive_clean_runs_required"
]);

function readReviewPolicyConsecutiveCleanRunsRequired(
  source: Record<string, unknown>,
  key: string,
  path: string,
  errors: ValidationError[],
  required: boolean
): number | undefined {
  const value = source[key];
  if (value === undefined) {
    if (required) {
      errors.push({ path, message: "Missing required field" });
    }
    return undefined;
  }

  if (!isInteger(value) || value < 1) {
    errors.push({
      path,
      message:
        `${REVIEW_POLICY_CONSECUTIVE_CLEAN_RUNS_REQUIRED_INVALID}: Must be an integer >= 1`
    });
    return undefined;
  }

  return value;
}

export function validateBubbleReviewPolicy(
  reviewPolicy: Record<string, unknown> | undefined,
  errors: ValidationError[]
): BubbleConfig["review_policy"] | undefined {
  if (reviewPolicy === undefined) {
    return undefined;
  }

  for (const key of Object.keys(reviewPolicy)) {
    if (allowedReviewPolicyKeys.has(key)) {
      continue;
    }

    errors.push({
      path: `review_policy.${key}`,
      message:
        `${REVIEW_POLICY_INVALID}: Unknown review_policy field "${key}"`
    });
  }

  const hasExplicitReviewPolicyFields = Object.keys(reviewPolicy).some((key) =>
    allowedReviewPolicyKeys.has(key)
  );

  const reviewPolicyLoopModeCandidate =
    reviewPolicy.review_loop_mode ?? DEFAULT_REVIEW_POLICY_LOOP_MODE;
  if (!isBubbleReviewLoopMode(reviewPolicyLoopModeCandidate)) {
    errors.push({
      path: "review_policy.review_loop_mode",
      message:
        `${REVIEW_POLICY_LOOP_MODE_INVALID}: Must be one of: full, meta_only`
    });
  }
  const reviewPolicyLoopMode = isBubbleReviewLoopMode(reviewPolicyLoopModeCandidate)
    ? reviewPolicyLoopModeCandidate
    : DEFAULT_REVIEW_POLICY_LOOP_MODE;

  const reviewPolicyReviewerSeverityCandidate =
    reviewPolicy.reviewer_blocking_min_severity
    ?? DEFAULT_REVIEW_POLICY_REVIEWER_BLOCKING_MIN_SEVERITY;
  if (!isBubbleReviewAutoReworkSeverity(reviewPolicyReviewerSeverityCandidate)) {
    errors.push({
      path: "review_policy.reviewer_blocking_min_severity",
      message:
        `${REVIEW_POLICY_THRESHOLD_INVALID}: Must be one of: P1, P2, P3`
    });
  }
  const reviewPolicyReviewerSeverity = isBubbleReviewAutoReworkSeverity(
    reviewPolicyReviewerSeverityCandidate
  )
    ? reviewPolicyReviewerSeverityCandidate
    : DEFAULT_REVIEW_POLICY_REVIEWER_BLOCKING_MIN_SEVERITY;

  const reviewPolicySeverityCandidate =
    reviewPolicy.meta_review_auto_rework_min_severity
    ?? DEFAULT_REVIEW_POLICY_AUTO_REWORK_MIN_SEVERITY;
  if (!isBubbleReviewAutoReworkSeverity(reviewPolicySeverityCandidate)) {
    errors.push({
      path: "review_policy.meta_review_auto_rework_min_severity",
      message:
        `${REVIEW_POLICY_THRESHOLD_INVALID}: Must be one of: P1, P2, P3`
    });
  }
  const reviewPolicySeverity = isBubbleReviewAutoReworkSeverity(
    reviewPolicySeverityCandidate
  )
    ? reviewPolicySeverityCandidate
    : DEFAULT_REVIEW_POLICY_AUTO_REWORK_MIN_SEVERITY;

  const reviewPolicyConsecutiveCleanRunsRequired =
    readReviewPolicyConsecutiveCleanRunsRequired(
      reviewPolicy,
      "meta_review_consecutive_clean_runs_required",
      "review_policy.meta_review_consecutive_clean_runs_required",
      errors,
      false
    );

  return !hasExplicitReviewPolicyFields
    ? undefined
    : {
        review_loop_mode: reviewPolicyLoopMode,
        reviewer_blocking_min_severity: reviewPolicyReviewerSeverity,
        meta_review_auto_rework_min_severity: reviewPolicySeverity,
        ...(reviewPolicyConsecutiveCleanRunsRequired !== undefined
          ? {
              meta_review_consecutive_clean_runs_required:
                reviewPolicyConsecutiveCleanRunsRequired
            }
          : {})
      };
}
