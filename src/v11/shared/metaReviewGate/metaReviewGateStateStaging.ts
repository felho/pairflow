import { applyStateTransition } from "../../../core/state/machine.js";
import { clearLiveMetaReviewSnapshot } from "../../../core/bubble/metaReview.js";
import { buildMetaReviewExecutionContext } from "../../../core/bubble/metaReviewExecutionContext.js";
import {
  StateStoreConflictError,
  type LoadedStateSnapshot,
  type writeStateSnapshot
} from "../../../core/state/stateStore.js";
import type { BubbleStateSnapshot } from "../../../types/bubble.js";
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
    return await input.writeState(
      input.statePath,
      {
        ...nextReadyForApproval,
        meta_review: clearLiveMetaReviewSnapshot(nextReadyForApproval.meta_review)
      },
      {
        expectedFingerprint: input.loadedRunning.fingerprint,
        expectedState: "RUNNING"
      }
    );
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
  const restoredRunningState = {
    ...input.loadedRunning.state,
    meta_review: clearLiveMetaReviewSnapshot(input.loadedRunning.state.meta_review)
  };
  try {
    await input.writeState(input.statePath, restoredRunningState, {
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
  bubbleId: string;
  readyForApproval: LoadedStateSnapshot;
  nowIso: string;
  watchdogTimeoutMinutes: number;
  statePath: string;
  writeState: typeof writeStateSnapshot;
}): Promise<LoadedStateSnapshot> {
  const previousMetaReview = clearLiveMetaReviewSnapshot(
    input.readyForApproval.state.meta_review
  );
  const attempt = previousMetaReview.auto_rework_count + 1;
  const nextState: BubbleStateSnapshot = {
    ...input.readyForApproval.state,
    state: "META_REVIEW_RUNNING" as const,
    active_agent: metaReviewerAgent,
    active_role: "meta_reviewer" as const,
    active_since: input.nowIso,
    last_command_at: input.nowIso,
    meta_review: {
      ...previousMetaReview,
      execution_context: buildMetaReviewExecutionContext({
        bubbleId: input.bubbleId,
        round: input.readyForApproval.state.round,
        startedAt: input.nowIso,
        watchdogTimeoutMinutes: input.watchdogTimeoutMinutes,
        attempt
      })
    }
  };
  return input.writeState(
    input.statePath,
    nextState,
    {
      expectedFingerprint: input.readyForApproval.fingerprint,
      expectedState: "READY_FOR_APPROVAL"
    }
  );
}
