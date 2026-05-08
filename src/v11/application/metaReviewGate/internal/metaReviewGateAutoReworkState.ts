import { applyStateTransition } from "../../../domain/state/machine.js";
import { assertValidBubbleStateSnapshot } from "../../../shared/state/stateSchema.js";
import { clearLiveMetaReviewSnapshot } from "../../../shared/metaReview/metaReviewSnapshot.js";
import type {
  AgentName
} from "../../../domain/agentIdentity/agentIdentity.js";
import type { BubbleStateSnapshot } from "../../../shared/state/bubbleStateSnapshotTypes.js";
import {
  incrementAutoReworkCount,
  normalizeMetaReviewSnapshot,
  setMetaReviewConsecutiveCleanRuns
} from "../../../domain/metaReviewGate/snapshotState.js";
import {
  resolveRuntimeAlignedNextRoundContinuation
} from "../../../domain/state/roundContinuation.js";

export interface AutoReworkStateInput {
  resolved: {
    bubbleId: string;
    bubbleConfig: {
      watchdog_timeout_minutes: number;
      agents: {
        implementer: AgentName;
        reviewer: AgentName;
      };
    };
  };
  loaded: {
    state: BubbleStateSnapshot;
  };
  now: Date;
}

export function buildAutoReworkResumedState(
  input: AutoReworkStateInput
): { resumed: BubbleStateSnapshot; nowIso: string } {
  const nowIso = input.now.toISOString();
  const streakResetState = setMetaReviewConsecutiveCleanRuns(
    input.loaded.state,
    0
  );
  const continuation = resolveRuntimeAlignedNextRoundContinuation({
    bubbleId: input.loaded.state.bubble_id,
    currentRound: input.loaded.state.round,
    roundRoleHistory: input.loaded.state.round_role_history,
    implementer: input.resolved.bubbleConfig.agents.implementer,
    reviewer: input.resolved.bubbleConfig.agents.reviewer,
    nowIso,
    watchdogTimeoutMinutes:
      input.resolved.bubbleConfig.watchdog_timeout_minutes
  });
  const resumedBase = assertValidBubbleStateSnapshot({
    ...streakResetState,
    state: "RUNNING",
    round: continuation.nextRound,
    active_agent: continuation.activeAgent,
    active_role: continuation.activeRole,
    execution_context: continuation.executionContext,
    active_since: nowIso,
    last_command_at: nowIso,
    round_role_history:
      continuation.appendRoundRoleEntry === undefined
        ? streakResetState.round_role_history
        : [
            ...streakResetState.round_role_history,
            continuation.appendRoundRoleEntry
          ],
    meta_review: clearLiveMetaReviewSnapshot(
      streakResetState.meta_review
    )
  });
  return {
    nowIso,
    resumed: assertValidBubbleStateSnapshot({
      ...resumedBase,
      meta_review: normalizeMetaReviewSnapshot(
        incrementAutoReworkCount(resumedBase).meta_review
      )
    })
  };
}

export function buildRestoredReadyState(input: {
  resumedState: BubbleStateSnapshot;
  loadedState: BubbleStateSnapshot;
  nowIso: string;
}): BubbleStateSnapshot {
  const restoredReady = applyStateTransition(input.resumedState, {
    to: "READY_FOR_HUMAN_APPROVAL",
    activeAgent: null,
    activeRole: null,
    activeSince: null,
    lastCommandAt: input.nowIso
  });
  return {
    ...restoredReady,
    round: input.loadedState.round,
    round_role_history: input.loadedState.round_role_history,
    meta_review: normalizeMetaReviewSnapshot(input.loadedState.meta_review)
  };
}
