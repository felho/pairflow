import { applyStateTransition } from "../../../core/state/machine.js";
import { buildRunningExecutionContext } from "../../../core/state/executionContext.js";
import {
  StateStoreConflictError,
  type LoadedStateSnapshot
} from "../../../core/state/stateStore.js";
import type { BubbleStateSnapshot } from "../../../types/bubble.js";
import type { MetaReviewRunResult } from "../../../core/bubble/metaReview.js";
import {
  buildHydratedMetaReviewSnapshotFromRunResult,
  normalizeMetaReviewSnapshot
} from "./metaReviewGateShared.js";
import { MetaReviewGateError } from "./metaReviewGateTypes.js";
import type { RecoverMetaReviewExecutionContext } from "./metaReviewGateRecoveryContext.js";
export { persistAutoReworkCounterAfterRecoveryDispatch } from "./metaReviewGateRecoveryAutoReworkCounter.js";

export async function transitionRecoveryToRunningForAutoRework(input: {
  context: RecoverMetaReviewExecutionContext;
  loaded: LoadedStateSnapshot;
}): Promise<LoadedStateSnapshot> {
  const nextRound = input.loaded.state.round + 1;
  const resumed = applyStateTransition(input.loaded.state, {
    to: "RUNNING",
    round: nextRound,
    activeAgent: input.context.resolved.bubbleConfig.agents.implementer,
    activeRole: "implementer",
    executionContext: buildRunningExecutionContext({
      bubbleId: input.loaded.state.bubble_id,
      round: nextRound,
      activeRole: "implementer",
      startedAt: input.context.nowIso,
      watchdogTimeoutMinutes: input.context.resolved.bubbleConfig.watchdog_timeout_minutes
    }),
    activeSince: input.context.nowIso,
    lastCommandAt: input.context.nowIso,
    appendRoundRoleEntry: {
      round: nextRound,
      implementer: input.context.resolved.bubbleConfig.agents.implementer,
      reviewer: input.context.resolved.bubbleConfig.agents.reviewer,
      switched_at: input.context.nowIso
    }
  });
  return input.context.writeState(input.context.resolved.bubblePaths.statePath, resumed, {
    expectedFingerprint: input.loaded.fingerprint,
    expectedState: "META_REVIEW_RUNNING"
  });
}

export async function restoreReadyForApprovalAfterDispatchFailure(input: {
  context: RecoverMetaReviewExecutionContext;
  loaded: LoadedStateSnapshot;
  resumedWritten: LoadedStateSnapshot;
  runResultForRouting: MetaReviewRunResult;
  appendReason: string;
}): Promise<{ readyForApproval: LoadedStateSnapshot; restoreOutcome: string }> {
  let restoreOutcome = "restore_outcome=not_attempted";
  try {
    const backToReady = applyStateTransition(input.resumedWritten.state, {
      to: "READY_FOR_APPROVAL",
      activeAgent: null,
      activeRole: null,
      activeSince: null,
      lastCommandAt: input.context.nowIso
    });
    const restoredCounterReady: BubbleStateSnapshot = {
      ...backToReady,
      round: input.loaded.state.round,
      round_role_history: input.loaded.state.round_role_history,
      meta_review: buildHydratedMetaReviewSnapshotFromRunResult({
        metaReview: normalizeMetaReviewSnapshot(backToReady.meta_review),
        runResult: input.runResultForRouting
      })
    };
    const readyForApproval = await input.context.writeState(
      input.context.resolved.bubblePaths.statePath,
      restoredCounterReady,
      {
        expectedFingerprint: input.resumedWritten.fingerprint,
        expectedState: "RUNNING"
      }
    );
    restoreOutcome = "restore_outcome=applied";
    return { readyForApproval, restoreOutcome };
  } catch (recoveryError) {
    const restoreReason =
      recoveryError instanceof Error ? recoveryError.message : String(recoveryError);
    restoreOutcome = `restore_outcome=failed restore_error=${restoreReason}`;
    if (recoveryError instanceof StateStoreConflictError) {
      throw new MetaReviewGateError(
        "META_REVIEW_GATE_STATE_CONFLICT",
        `META_REVIEW_GATE_STATE_CONFLICT: auto-rework dispatch append failed (append_error=${input.appendReason}) and restore to READY_FOR_APPROVAL failed (${restoreOutcome}).`,
        {
          stageReasonCode: "META_REVIEW_GATE_STATE_CONFLICT"
        }
      );
    }
    throw new MetaReviewGateError(
      "META_REVIEW_GATE_TRANSITION_INVALID",
      `META_REVIEW_GATE_TRANSITION_INVALID: auto-rework dispatch append failed (append_error=${input.appendReason}) and restore to READY_FOR_APPROVAL failed (${restoreOutcome}).`,
      {
        stageReasonCode: "META_REVIEW_GATE_TRANSITION_INVALID"
      }
    );
  }
}
