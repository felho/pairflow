import { DEFAULT_META_REVIEW_AUTO_REWORK_LIMIT } from "../../shared/metaReview/metaReviewSnapshotTypes.js";
import type { BubbleMetaReviewSnapshotState } from "../../shared/metaReview/metaReviewSnapshotTypes.js";
import type { BubbleStateSnapshot } from "../../domain/state/snapshot/bubbleStateSnapshot.js";

export function normalizeMetaReviewSnapshot(
  snapshot: BubbleMetaReviewSnapshotState | undefined
): BubbleMetaReviewSnapshotState {
  if (snapshot !== undefined) {
    return {
      execution_context: snapshot.execution_context ?? null,
      runtime_delivery: snapshot.runtime_delivery ?? null,
      auto_rework_count: snapshot.auto_rework_count,
      auto_rework_limit: snapshot.auto_rework_limit,
      sticky_human_gate: snapshot.sticky_human_gate,
      consecutive_clean_runs: snapshot.consecutive_clean_runs ?? 0
    };
  }

  return {
    execution_context: null,
    runtime_delivery: null,
    auto_rework_count: 0,
    auto_rework_limit: DEFAULT_META_REVIEW_AUTO_REWORK_LIMIT,
    sticky_human_gate: false,
    consecutive_clean_runs: 0
  };
}

export function incrementAutoReworkCount(input: BubbleStateSnapshot): BubbleStateSnapshot {
  const metaReview = normalizeMetaReviewSnapshot(input.meta_review);
  return {
    ...input,
    meta_review: {
      ...metaReview,
      auto_rework_count: metaReview.auto_rework_count + 1
    }
  };
}

export function setMetaReviewConsecutiveCleanRuns(
  input: BubbleStateSnapshot,
  consecutiveCleanRuns: number
): BubbleStateSnapshot {
  const metaReview = normalizeMetaReviewSnapshot(input.meta_review);
  return {
    ...input,
    meta_review: {
      ...metaReview,
      consecutive_clean_runs: consecutiveCleanRuns
    }
  };
}
