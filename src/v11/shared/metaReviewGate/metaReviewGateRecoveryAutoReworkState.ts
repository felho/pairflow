import { applyStateTransition } from "../../../core/state/machine.js";
import {
  StateStoreConflictError,
  type LoadedStateSnapshot
} from "../../../core/state/stateStore.js";
import type { BubbleMetaReviewSnapshotState, BubbleStateSnapshot } from "../../../types/bubble.js";
import type { MetaReviewRunResult } from "../../../core/bubble/metaReview.js";
import {
  buildHydratedMetaReviewSnapshotFromRunResult,
  incrementAutoReworkCount,
  metaReviewGateAutoReworkRetryRunIdentityInvariantReasonCode,
  normalizeMetaReviewSnapshot,
  resolveAutoReworkRetryInvariantViolation,
  resolveCanonicalMetaReviewRunId,
  toConflictError,
  toTransitionError
} from "./metaReviewGateShared.js";
import { MetaReviewGateError } from "./metaReviewGateTypes.js";
import type { RecoverMetaReviewExecutionContext } from "./metaReviewGateRecoveryContext.js";

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

export async function persistAutoReworkCounterAfterRecoveryDispatch(input: {
  context: RecoverMetaReviewExecutionContext;
  snapshot: BubbleMetaReviewSnapshotState;
  resumedWritten: LoadedStateSnapshot;
  runResultForRouting: MetaReviewRunResult;
}): Promise<LoadedStateSnapshot> {
  let written: LoadedStateSnapshot | undefined;
  try {
    const resumedWithHydratedRun: BubbleStateSnapshot = {
      ...input.resumedWritten.state,
      meta_review: buildHydratedMetaReviewSnapshotFromRunResult({
        metaReview: normalizeMetaReviewSnapshot(input.resumedWritten.state.meta_review),
        runResult: input.runResultForRouting
      })
    };
    const resumedWithCounter = incrementAutoReworkCount(resumedWithHydratedRun);
    written = await input.context.writeState(
      input.context.resolved.bubblePaths.statePath,
      resumedWithCounter,
      {
        expectedFingerprint: input.resumedWritten.fingerprint,
        expectedState: "RUNNING"
      }
    );
  } catch (error) {
    if (!(error instanceof StateStoreConflictError)) {
      throw toTransitionError(error);
    }
    let latestConflict: StateStoreConflictError = error;
    const expectedCount = input.snapshot.auto_rework_count;
    const targetCount = expectedCount + 1;

    for (let attempt = 0; attempt < 3; attempt += 1) {
      const latest = await input.context.readState(
        input.context.resolved.bubblePaths.statePath
      );
      if (latest.state.state !== "RUNNING") {
        throw toConflictError(latestConflict);
      }
      const retryInvariantViolation = resolveAutoReworkRetryInvariantViolation({
        latest: latest.state,
        expected: input.resumedWritten.state
      });
      if (retryInvariantViolation !== null) {
        throw new MetaReviewGateError(
          "META_REVIEW_GATE_STATE_CONFLICT",
          `META_REVIEW_GATE_STATE_CONFLICT: auto-rework CAS retry invariant failed (retry_invariant_reason_code=${retryInvariantViolation}; attempt=${attempt + 1}).`,
          {
            retryInvariantReasonCode: retryInvariantViolation
          }
        );
      }

      const latestMetaReview = normalizeMetaReviewSnapshot(latest.state.meta_review);
      if (latestMetaReview.auto_rework_count >= targetCount) {
        written = latest;
        break;
      }

      const retryRunId =
        typeof input.runResultForRouting.run_id === "string" &&
        input.runResultForRouting.run_id.trim().length > 0
          ? input.runResultForRouting.run_id
          : null;
      const latestCanonicalRunId = resolveCanonicalMetaReviewRunId(latestMetaReview);
      if (
        latestCanonicalRunId !== null &&
        retryRunId !== null &&
        latestCanonicalRunId !== retryRunId
      ) {
        throw new MetaReviewGateError(
          "META_REVIEW_GATE_STATE_CONFLICT",
          `META_REVIEW_GATE_STATE_CONFLICT: auto-rework CAS retry invariant failed (retry_invariant_reason_code=${metaReviewGateAutoReworkRetryRunIdentityInvariantReasonCode}; attempt=${attempt + 1}).`,
          {
            retryInvariantReasonCode:
              metaReviewGateAutoReworkRetryRunIdentityInvariantReasonCode
          }
        );
      }

      const latestHydratedMetaReview = buildHydratedMetaReviewSnapshotFromRunResult({
        metaReview: latestMetaReview,
        runResult: input.runResultForRouting
      });
      const latestIncremented: BubbleStateSnapshot = {
        ...latest.state,
        meta_review: {
          ...latestHydratedMetaReview,
          auto_rework_count: targetCount
        }
      };
      try {
        written = await input.context.writeState(
          input.context.resolved.bubblePaths.statePath,
          latestIncremented,
          {
            expectedFingerprint: latest.fingerprint,
            expectedState: "RUNNING"
          }
        );
        break;
      } catch (retryError) {
        if (!(retryError instanceof StateStoreConflictError)) {
          throw toTransitionError(retryError);
        }
        latestConflict = retryError;
      }
    }
    if (written === undefined) {
      throw toConflictError(latestConflict);
    }
  }
  if (written === undefined) {
    throw new MetaReviewGateError(
      "META_REVIEW_GATE_STATE_CONFLICT",
      "META_REVIEW_GATE_STATE_CONFLICT: auto-rework count update did not converge after dispatch.",
      {
        stageReasonCode: "META_REVIEW_GATE_STATE_CONFLICT"
      }
    );
  }
  return written;
}
