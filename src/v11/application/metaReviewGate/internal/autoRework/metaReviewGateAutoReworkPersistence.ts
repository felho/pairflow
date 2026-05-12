import type { LoadedDomainStateSnapshot } from "../../../../ports/stateSnapshots.js";
import { isNamedError } from "../../../../shared/errors/namedError.js";
import { buildBubbleStateSnapshotVariant } from "../../../../domain/state/snapshot/buildBubbleStateSnapshot.js";
import { toPersistedSnapshot } from "../../../../domain/state/snapshot/projection.js";
import type { PersistedBubbleStateSnapshot } from "../../../../domain/state/snapshot/persistedBubbleStateSnapshot.js";
import { MetaReviewGateError } from "../../../../shared/metaReviewGate/metaReviewGateRouteContract.js";
import type { AutoReworkFinalizeInput } from "./metaReviewGateAutoReworkContract.js";
import { buildRestoredReadyState } from "./metaReviewGateAutoReworkState.js";

function toGateConflictError(error: unknown): MetaReviewGateError {
  const message = error instanceof Error ? error.message : String(error);
  return new MetaReviewGateError(
    "META_REVIEW_GATE_STATE_CONFLICT",
    `META_REVIEW_GATE_STATE_CONFLICT: ${message}`,
    {
      stageReasonCode: "META_REVIEW_GATE_STATE_CONFLICT"
    }
  );
}

function toGateTransitionError(error: unknown): MetaReviewGateError {
  const message = error instanceof Error ? error.message : String(error);
  return new MetaReviewGateError(
    "META_REVIEW_GATE_TRANSITION_INVALID",
    `META_REVIEW_GATE_TRANSITION_INVALID: ${message}`,
    {
      stageReasonCode: "META_REVIEW_GATE_TRANSITION_INVALID"
    }
  );
}

export async function writeAutoReworkResumedState(input: {
  finalizeInput: AutoReworkFinalizeInput;
  resumed: PersistedBubbleStateSnapshot;
}): Promise<LoadedDomainStateSnapshot> {
  try {
    // resumed is still persisted-shape (buildAutoReworkResumedState is a
    // later-batch helper). Wrap for the Domain write port.
    return await input.finalizeInput.writeState(
      input.finalizeInput.resolved.bubblePaths.statePath,
      buildBubbleStateSnapshotVariant(input.resumed),
      {
        expectedFingerprint: input.finalizeInput.loaded.fingerprint,
        expectedState: "RUNNING"
      }
    );
  } catch (error) {
    if (isNamedError(error, "StateStoreConflictError")) {
      throw toGateConflictError(error);
    }
    throw toGateTransitionError(error);
  }
}

export async function restoreReadyStateAfterAppendFailure(input: {
  finalizeInput: AutoReworkFinalizeInput;
  resumedWritten: LoadedDomainStateSnapshot;
  nowIso: string;
}): Promise<LoadedDomainStateSnapshot> {
  // buildRestoredReadyState consumes persisted shape (later batch); project
  // at the boundary and rebuild the variant before the Domain write port.
  const restoredState = buildRestoredReadyState({
    resumedState: toPersistedSnapshot(input.resumedWritten.state),
    loadedState: toPersistedSnapshot(input.finalizeInput.loaded.state),
    nowIso: input.nowIso
  });

  try {
    return await input.finalizeInput.writeState(
      input.finalizeInput.resolved.bubblePaths.statePath,
      buildBubbleStateSnapshotVariant(restoredState),
      {
        expectedFingerprint: input.resumedWritten.fingerprint,
        expectedState: "RUNNING"
      }
    );
  } catch (restoreError) {
    if (isNamedError(restoreError, "StateStoreConflictError")) {
      throw toGateConflictError(restoreError);
    }
    throw toGateTransitionError(restoreError);
  }
}
