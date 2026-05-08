export const bubbleReviewLoopModes = ["full", "meta_only"] as const;

export type BubbleReviewLoopMode = (typeof bubbleReviewLoopModes)[number];

export const bubbleReviewAutoReworkSeverities = ["P1", "P2", "P3"] as const;

export type BubbleReviewAutoReworkSeverity =
  (typeof bubbleReviewAutoReworkSeverities)[number];

export const bubbleReviewSupportStatuses = ["enabled", "guarded"] as const;

export type BubbleReviewSupportStatus =
  (typeof bubbleReviewSupportStatuses)[number];

export interface BubbleReviewPolicyConfig {
  review_loop_mode: BubbleReviewLoopMode;
  reviewer_blocking_min_severity: BubbleReviewAutoReworkSeverity;
  meta_review_auto_rework_min_severity: BubbleReviewAutoReworkSeverity;
  meta_review_consecutive_clean_runs_required?: number;
}

export interface BubbleReviewPolicyRuntimeView {
  requested_loop_mode: BubbleReviewLoopMode;
  effective_loop_mode: BubbleReviewLoopMode;
  support_status: BubbleReviewSupportStatus;
  reviewer_blocking_min_severity: BubbleReviewAutoReworkSeverity;
  meta_review_auto_rework_min_severity: BubbleReviewAutoReworkSeverity;
  meta_review_consecutive_clean_runs_required: number;
  blocked_reason_code?: string;
  blocked_prerequisites?: string[];
  provenance_note?: string;
}

export function isBubbleReviewLoopMode(
  value: unknown
): value is BubbleReviewLoopMode {
  return (
    typeof value === "string"
    && (bubbleReviewLoopModes as readonly string[]).includes(value)
  );
}

export function isBubbleReviewAutoReworkSeverity(
  value: unknown
): value is BubbleReviewAutoReworkSeverity {
  return (
    typeof value === "string"
    && (bubbleReviewAutoReworkSeverities as readonly string[]).includes(value)
  );
}
