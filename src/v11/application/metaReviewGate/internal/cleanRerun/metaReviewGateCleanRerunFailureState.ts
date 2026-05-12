import type { PersistedBubbleStateSnapshot } from "../../../../domain/state/snapshot/persistedBubbleStateSnapshot.js";
import { buildBubbleStateSnapshotVariant } from "../../../../domain/state/snapshot/buildBubbleStateSnapshot.js";
import { toPersistedSnapshot } from "../../../../domain/state/snapshot/projection.js";
import { setMetaReviewConsecutiveCleanRuns } from "../../../../domain/metaReviewGate/snapshotState.js";

export function buildCleanRerunDispatchFailureRollbackState(
  state: PersistedBubbleStateSnapshot
): PersistedBubbleStateSnapshot {
  // setMetaReviewConsecutiveCleanRuns operates on the variant union.
  // The rollbackStateOnAppendFailure consumer contract (cross-batch
  // border per §10.13) still requires persisted-shape; project at the
  // function boundary. The wraps dissolve uniformly with the canonical
  // parser flip in Step 4b-γ/4.
  const resetState = toPersistedSnapshot(
    setMetaReviewConsecutiveCleanRuns(buildBubbleStateSnapshotVariant(state), 0)
  );
  if (resetState.meta_review === undefined) return resetState;
  return {
    ...resetState,
    meta_review: {
      ...resetState.meta_review,
      runtime_delivery: null
    }
  };
}
