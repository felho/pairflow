import type {
  BubbleReviewAutoReworkSeverity,
  BubbleReviewLoopMode
} from "./reviewPolicyTypes.js";

export const REVIEW_POLICY_WRITE_CONFLICT =
  "REVIEW_POLICY_WRITE_CONFLICT" as const;
export const REVIEW_POLICY_PATCH_INVALID = "REVIEW_POLICY_PATCH_INVALID" as const;

export interface BubbleReviewPolicyPatch {
  review_loop_mode?: BubbleReviewLoopMode;
  reviewer_blocking_min_severity?: BubbleReviewAutoReworkSeverity;
  meta_review_auto_rework_min_severity?: BubbleReviewAutoReworkSeverity;
  meta_review_consecutive_clean_runs_required?: number;
}

export interface SharedUiReviewPolicyPatchInput {
  reviewLoopMode: BubbleReviewLoopMode;
  reviewBlockingMinSeverity?: BubbleReviewAutoReworkSeverity;
  metaReviewQualityPreset?: MetaReviewQualityPreset;
}

export const metaReviewQualityPresets = ["P1", "P2", "P3", "P3+1", "P3+2"] as const;
export type MetaReviewQualityPreset = (typeof metaReviewQualityPresets)[number];

export function isMetaReviewQualityPreset(
  value: unknown
): value is MetaReviewQualityPreset {
  return (
    typeof value === "string"
    && (metaReviewQualityPresets as readonly string[]).includes(value)
  );
}

export function buildSharedUiReviewPolicyPatch(
  input: SharedUiReviewPolicyPatchInput
): BubbleReviewPolicyPatch {
  if (input.metaReviewQualityPreset !== undefined) {
    const metaReviewQualityPreset: unknown = input.metaReviewQualityPreset;
    if (!isMetaReviewQualityPreset(metaReviewQualityPreset)) {
      throw new Error(
        `${REVIEW_POLICY_PATCH_INVALID}: metaReviewQualityPreset must be one of ${metaReviewQualityPresets.join(", ")}. context: meta_review_quality_preset=${String(metaReviewQualityPreset)}.`
      );
    }
    const severity =
      metaReviewQualityPreset === "P3+1" || metaReviewQualityPreset === "P3+2"
        ? "P3"
        : metaReviewQualityPreset;
    if (
      input.reviewBlockingMinSeverity !== undefined
      && input.reviewBlockingMinSeverity !== severity
    ) {
      throw new Error(
        `${REVIEW_POLICY_PATCH_INVALID}: reviewBlockingMinSeverity must match the selected metaReviewQualityPreset severity (${severity}) when both fields are provided. context: meta_review_quality_preset=${input.metaReviewQualityPreset} reviewer_blocking_min_severity=${input.reviewBlockingMinSeverity}.`
      );
    }
    return {
      review_loop_mode: input.reviewLoopMode,
      reviewer_blocking_min_severity: severity,
      meta_review_auto_rework_min_severity: severity,
      meta_review_consecutive_clean_runs_required:
        metaReviewQualityPreset === "P3+1"
          ? 2
          : metaReviewQualityPreset === "P3+2"
            ? 3
            : 1
    };
  }

  return {
    review_loop_mode: input.reviewLoopMode,
    ...(input.reviewBlockingMinSeverity !== undefined
      ? {
          reviewer_blocking_min_severity: input.reviewBlockingMinSeverity,
          meta_review_auto_rework_min_severity: input.reviewBlockingMinSeverity
        }
      : {})
  };
}
