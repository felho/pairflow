import { applyStateTransition } from "../../../../domain/state/machine.js";
import { assertParsedBubbleStateSnapshot } from "../../../../domain/state/stateSchema.js";
import { buildBubbleStateSnapshotVariant } from "../../../../domain/state/snapshot/buildBubbleStateSnapshot.js";
import { toPersistedSnapshot } from "../../../../domain/state/snapshot/projection.js";
import { clearLiveMetaReviewSnapshot } from "../../../../shared/metaReview/metaReviewSnapshot.js";
import type { AgentName } from "../../../../../contracts/kernel/agentIdentity.js";
import type { BubbleStateSnapshot } from "../../../../domain/state/snapshot/bubbleStateSnapshot.js";
import {
  incrementAutoReworkCount,
  normalizeMetaReviewSnapshot,
  setMetaReviewConsecutiveCleanRuns
} from "../../../../domain/metaReviewGate/snapshotState.js";
import {
  resolveRuntimeAlignedNextRoundContinuation
} from "../../../../domain/state/roundContinuation.js";

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
  const streakResetState = toPersistedSnapshot(
    setMetaReviewConsecutiveCleanRuns(input.loaded.state, 0)
  );
  const continuation = resolveRuntimeAlignedNextRoundContinuation({
    bubbleId: streakResetState.bubble_id,
    currentRound: streakResetState.round,
    roundRoleHistory: streakResetState.round_role_history,
    implementer: input.resolved.bubbleConfig.agents.implementer,
    reviewer: input.resolved.bubbleConfig.agents.reviewer,
    nowIso,
    watchdogTimeoutMinutes:
      input.resolved.bubbleConfig.watchdog_timeout_minutes
  });
  const resumedBase = assertParsedBubbleStateSnapshot({
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
  const resumedWithIncrementedCount = toPersistedSnapshot(
    incrementAutoReworkCount(buildBubbleStateSnapshotVariant(resumedBase))
  );
  return {
    nowIso,
    resumed: buildBubbleStateSnapshotVariant(
      assertParsedBubbleStateSnapshot({
        ...resumedBase,
        meta_review: normalizeMetaReviewSnapshot(
          resumedWithIncrementedCount.meta_review
        )
      })
    )
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
  const loadedPersisted = toPersistedSnapshot(input.loadedState);
  return buildBubbleStateSnapshotVariant({
    ...toPersistedSnapshot(restoredReady),
    round: loadedPersisted.round,
    round_role_history: loadedPersisted.round_role_history,
    meta_review: normalizeMetaReviewSnapshot(loadedPersisted.meta_review)
  });
}
