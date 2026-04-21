import {
  DEFAULT_REVIEW_POLICY_AUTO_REWORK_MIN_SEVERITY,
  DEFAULT_REVIEW_POLICY_LOOP_MODE
} from "../../../config/defaults.js";
import type {
  BubbleConfig,
  BubbleReviewPolicyConfig,
  BubbleReviewPolicyRuntimeView
} from "../../../types/bubble.js";

export const REVIEW_POLICY_META_ONLY_GUARDED =
  "REVIEW_POLICY_META_ONLY_GUARDED" as const;

export type NormalizedBubbleReviewPolicy = BubbleReviewPolicyConfig;

export function normalizeBubbleReviewPolicy(
  config: Pick<BubbleConfig, "review_policy">
): NormalizedBubbleReviewPolicy {
  return {
    review_loop_mode:
      config.review_policy?.review_loop_mode ?? DEFAULT_REVIEW_POLICY_LOOP_MODE,
    meta_review_auto_rework_min_severity:
      config.review_policy?.meta_review_auto_rework_min_severity
      ?? DEFAULT_REVIEW_POLICY_AUTO_REWORK_MIN_SEVERITY
  };
}

export function buildBubbleReviewPolicyRuntimeView(
  config: Pick<BubbleConfig, "review_policy">
): BubbleReviewPolicyRuntimeView {
  const normalized = normalizeBubbleReviewPolicy(config);
  if (normalized.review_loop_mode === "meta_only") {
    return {
      requested_loop_mode: normalized.review_loop_mode,
      effective_loop_mode: "full",
      support_status: "guarded",
      meta_review_auto_rework_min_severity:
        normalized.meta_review_auto_rework_min_severity,
      blocked_reason_code: REVIEW_POLICY_META_ONLY_GUARDED
    };
  }

  return {
    requested_loop_mode: normalized.review_loop_mode,
    effective_loop_mode: normalized.review_loop_mode,
    support_status: "enabled",
    meta_review_auto_rework_min_severity:
      normalized.meta_review_auto_rework_min_severity
  };
}
