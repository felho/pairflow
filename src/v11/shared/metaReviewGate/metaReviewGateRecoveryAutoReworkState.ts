import { applyStateTransition } from "../../domain/state/machine.js";
import { buildRunningExecutionContext } from "../../shared/state/executionContext.js";
import { assertValidBubbleStateSnapshot } from "../../shared/state/stateSchema.js";
import {
  type LoadedStateSnapshot
} from "../ports/stateSnapshots.js";
import type { BubbleStateSnapshot } from "../../../types/bubble.js";
import type { MetaReviewResult } from "../metaReview/metaReviewTypes.js";
import {
  buildHydratedMetaReviewSnapshotFromRunResult,
  normalizeMetaReviewSnapshot
} from "./metaReviewGateShared.js";
import { clearLiveMetaReviewSnapshot } from "../metaReview/metaReviewSnapshot.js";
import { MetaReviewGateError } from "./metaReviewGateTypes.js";
import type { RecoverMetaReviewExecutionContext } from "./metaReviewGateRecoveryContext.js";
import { isNamedError } from "../errors/namedError.js";
export { persistAutoReworkCounterAfterRecoveryDispatch } from "./metaReviewGateRecoveryAutoReworkCounter.js";

export async function transitionRecoveryToRunningForAutoRework(input: {
  context: RecoverMetaReviewExecutionContext;
  loaded: LoadedStateSnapshot;
}): Promise<LoadedStateSnapshot> {
  const nextRound = input.loaded.state.round + 1;
  const resumed = assertValidBubbleStateSnapshot({
    ...input.loaded.state,
    state: "RUNNING",
    round: nextRound,
    active_agent: input.context.resolved.bubbleConfig.agents.implementer,
    active_role: "implementer",
    execution_context: buildRunningExecutionContext({
      bubbleId: input.loaded.state.bubble_id,
      round: nextRound,
      activeRole: "implementer",
      startedAt: input.context.nowIso,
      watchdogTimeoutMinutes: input.context.resolved.bubbleConfig.watchdog_timeout_minutes
    }),
    active_since: input.context.nowIso,
    last_command_at: input.context.nowIso,
    round_role_history: [
      ...input.loaded.state.round_role_history,
      {
        round: nextRound,
        implementer: input.context.resolved.bubbleConfig.agents.implementer,
        reviewer: input.context.resolved.bubbleConfig.agents.reviewer,
        switched_at: input.context.nowIso
      }
    ],
    meta_review: clearLiveMetaReviewSnapshot(input.loaded.state.meta_review)
  });
  return input.context.writeState(input.context.resolved.bubblePaths.statePath, resumed, {
    expectedFingerprint: input.loaded.fingerprint,
    expectedState: "RUNNING"
  });
}

export async function restoreHumanGateAfterDispatchFailure(input: {
  context: RecoverMetaReviewExecutionContext;
  loaded: LoadedStateSnapshot;
  resumedWritten: LoadedStateSnapshot;
  runResultForRouting: MetaReviewResult;
  appendReason: string;
}): Promise<{ readyForHumanApproval: LoadedStateSnapshot; restoreOutcome: string }> {
  let restoreOutcome = "restore_outcome=not_attempted";
  try {
    const backToReady = applyStateTransition(input.resumedWritten.state, {
      to: "READY_FOR_HUMAN_APPROVAL",
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
    const readyForHumanApproval = await input.context.writeState(
      input.context.resolved.bubblePaths.statePath,
      restoredCounterReady,
      {
        expectedFingerprint: input.resumedWritten.fingerprint,
        expectedState: "RUNNING"
      }
    );
    restoreOutcome = "restore_outcome=applied";
    return { readyForHumanApproval, restoreOutcome };
  } catch (recoveryError) {
    const restoreReason =
      recoveryError instanceof Error ? recoveryError.message : String(recoveryError);
    restoreOutcome = `restore_outcome=failed restore_error=${restoreReason}`;
    if (isNamedError(recoveryError, "StateStoreConflictError")) {
      throw new MetaReviewGateError(
        "META_REVIEW_GATE_STATE_CONFLICT",
        `META_REVIEW_GATE_STATE_CONFLICT: auto-rework dispatch append failed (append_error=${input.appendReason}) and restore to READY_FOR_HUMAN_APPROVAL failed (${restoreOutcome}).`,
        {
          stageReasonCode: "META_REVIEW_GATE_STATE_CONFLICT"
        }
      );
    }
    throw new MetaReviewGateError(
      "META_REVIEW_GATE_TRANSITION_INVALID",
      `META_REVIEW_GATE_TRANSITION_INVALID: auto-rework dispatch append failed (append_error=${input.appendReason}) and restore to READY_FOR_HUMAN_APPROVAL failed (${restoreOutcome}).`,
      {
        stageReasonCode: "META_REVIEW_GATE_TRANSITION_INVALID"
      }
    );
  }
}
