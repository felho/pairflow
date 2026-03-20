import { applyStateTransition } from "../../../core/state/machine.js";
import {
  StateStoreConflictError,
  type LoadedStateSnapshot,
  type writeStateSnapshot
} from "../../../core/state/stateStore.js";
import { toMetaReviewGateError } from "./metaReviewGateErrorConversion.js";
import {
  metaReviewGateStagedReadyRestoreAppliedReasonCode,
  metaReviewGateStagedReadyRestoreStateConflictReasonCode,
  metaReviewGateStagedReadyRestoreTransitionInvalidReasonCode,
  metaReviewerAgent,
  toConflictError,
  toTransitionError
} from "./metaReviewGateShared.js";
import { MetaReviewGateError } from "./metaReviewGateTypes.js";

export async function stageReadyForApprovalState(input: {
  loadedRunning: LoadedStateSnapshot;
  nowIso: string;
  statePath: string;
  writeState: typeof writeStateSnapshot;
}): Promise<LoadedStateSnapshot> {
  try {
    const nextReadyForApproval = applyStateTransition(input.loadedRunning.state, {
      to: "READY_FOR_APPROVAL",
      activeAgent: null,
      activeRole: null,
      activeSince: null,
      lastCommandAt: input.nowIso
    });
    return await input.writeState(input.statePath, nextReadyForApproval, {
      expectedFingerprint: input.loadedRunning.fingerprint,
      expectedState: "RUNNING"
    });
  } catch (error) {
    if (error instanceof StateStoreConflictError) {
      throw toConflictError(error);
    }
    throw toTransitionError(error);
  }
}

export async function restoreRunningAfterStagedReadyFailure(input: {
  rootError: unknown;
  stageReasonCode: string;
  writeState: typeof writeStateSnapshot;
  statePath: string;
  loadedRunning: LoadedStateSnapshot;
  readyForApproval: LoadedStateSnapshot;
}): Promise<never> {
  const rootGateError = toMetaReviewGateError(input.rootError);
  try {
    await input.writeState(input.statePath, input.loadedRunning.state, {
      expectedFingerprint: input.readyForApproval.fingerprint,
      expectedState: "READY_FOR_APPROVAL"
    });
  } catch (restoreError) {
    const restoreReason = restoreError instanceof Error
      ? restoreError.message
      : String(restoreError);
    const restoreReasonCode =
      restoreError instanceof StateStoreConflictError
        ? metaReviewGateStagedReadyRestoreStateConflictReasonCode
        : metaReviewGateStagedReadyRestoreTransitionInvalidReasonCode;
    throw new MetaReviewGateError(
      restoreError instanceof StateStoreConflictError
        ? "META_REVIEW_GATE_STATE_CONFLICT"
        : "META_REVIEW_GATE_TRANSITION_INVALID",
      `${restoreError instanceof StateStoreConflictError ? "META_REVIEW_GATE_STATE_CONFLICT" : "META_REVIEW_GATE_TRANSITION_INVALID"}: ${input.stageReasonCode}: failed after READY_FOR_APPROVAL staging and restore to RUNNING failed (restore_reason_code=${restoreReasonCode}; restore_error=${restoreReason}). Root error: ${rootGateError.message}`,
      {
        ...rootGateError.diagnostics,
        stageReasonCode: input.stageReasonCode,
        restoreReasonCode
      }
    );
  }
  throw new MetaReviewGateError(
    rootGateError.reasonCode,
    `${rootGateError.reasonCode}: ${input.stageReasonCode}: failed after READY_FOR_APPROVAL staging and restore to RUNNING applied (restore_reason_code=${metaReviewGateStagedReadyRestoreAppliedReasonCode}). Root error: ${rootGateError.message}`,
    {
      ...rootGateError.diagnostics,
      stageReasonCode: input.stageReasonCode,
      restoreReasonCode: metaReviewGateStagedReadyRestoreAppliedReasonCode
    }
  );
}

export async function stageMetaReviewRunningState(input: {
  readyForApproval: LoadedStateSnapshot;
  nowIso: string;
  statePath: string;
  writeState: typeof writeStateSnapshot;
}): Promise<LoadedStateSnapshot> {
  const nextMetaReviewRunning = applyStateTransition(input.readyForApproval.state, {
    to: "META_REVIEW_RUNNING",
    activeAgent: metaReviewerAgent,
    activeRole: "meta_reviewer",
    activeSince: input.nowIso,
    lastCommandAt: input.nowIso
  });
  return input.writeState(
    input.statePath,
    nextMetaReviewRunning,
    {
      expectedFingerprint: input.readyForApproval.fingerprint,
      expectedState: "READY_FOR_APPROVAL"
    }
  );
}
