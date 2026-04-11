import {
  MetaReviewGateError,
  type MetaReviewGateResult,
  type RecoverMetaReviewGateFromSnapshotDependencies,
  type RecoverMetaReviewGateFromSnapshotInput
} from "./metaReviewGateTypes.js";

function buildUnsupportedRecoveryMessage(input: RecoverMetaReviewGateFromSnapshotInput): string {
  const location = input.repoPath ?? input.cwd ?? "current workspace";
  return [
    "META_REVIEW_GATE_TRANSITION_INVALID: snapshot-driven meta-review recovery is no longer supported in the Phase 1 runtime.",
    `bubble_id=${input.bubbleId}; location=${location}.`,
    "Use the canonical current-run submit path or restart/re-run meta-review instead of replaying a persisted snapshot."
  ].join(" ");
}

export function recoverMetaReviewGateFromSnapshot(
  input: RecoverMetaReviewGateFromSnapshotInput,
  dependencies: RecoverMetaReviewGateFromSnapshotDependencies = {}
): Promise<MetaReviewGateResult> {
  void dependencies;
  return Promise.reject(
    new MetaReviewGateError(
      "META_REVIEW_GATE_TRANSITION_INVALID",
      buildUnsupportedRecoveryMessage(input),
      {
        bubbleId: input.bubbleId,
        stageReasonCode: "META_REVIEW_GATE_TRANSITION_INVALID",
        restoreReasonCode: "meta_review_recovery_removed_phase1"
      }
    )
  );
}
