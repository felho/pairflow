import type { BubbleStateSnapshot } from "../../../../domain/state/snapshot/bubbleStateSnapshotTypes.js";
import { setMetaReviewConsecutiveCleanRuns } from "../../../../domain/metaReviewGate/snapshotState.js";

export function buildCleanRerunDispatchFailureRollbackState(
  state: BubbleStateSnapshot
): BubbleStateSnapshot {
  const resetState = setMetaReviewConsecutiveCleanRuns(state, 0);
  if (resetState.meta_review === undefined) return resetState;
  return {
    ...resetState,
    meta_review: {
      ...resetState.meta_review,
      runtime_delivery: null
    }
  };
}
