import type { LoadedStateSnapshot } from "../../../../ports/stateSnapshots.js";
import { isNamedError } from "../../../../shared/errors/namedError.js";
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
}): Promise<LoadedStateSnapshot> {
  try {
    return await input.finalizeInput.writeState(
      input.finalizeInput.resolved.bubblePaths.statePath,
      input.resumed,
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
  resumedWritten: LoadedStateSnapshot;
  nowIso: string;
}): Promise<LoadedStateSnapshot> {
  const restoredState = buildRestoredReadyState({
    resumedState: input.resumedWritten.state,
    loadedState: input.finalizeInput.loaded.state,
    nowIso: input.nowIso
  });

  try {
    return await input.finalizeInput.writeState(
      input.finalizeInput.resolved.bubblePaths.statePath,
      restoredState,
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
