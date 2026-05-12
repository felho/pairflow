import type { BubbleStateSnapshot } from "../../../../domain/state/snapshot/bubbleStateSnapshot.js";
import { toPersistedSnapshot } from "../../../../domain/state/snapshot/projection.js";
import { assertParsedBubbleStateSnapshot } from "../../../../domain/state/stateSchema.js";
import { buildRunningExecutionContext } from "../../../../domain/state/execution/executionContext.js";
import type { BubbleConfig } from "../../../../shared/config/bubbleConfigTypes.js";
import type {
  RoundRoleHistoryEntry
} from "../../../../domain/state/snapshot/roundRoleHistory.js";

export interface BuildKickoffNextStateInput {
  state: BubbleStateSnapshot;
  bubbleConfig: Pick<BubbleConfig, "agents" | "watchdog_timeout_minutes">;
  nowIso: string;
}

function buildKickoffRoundOneRoleHistory(input: {
  state: BubbleStateSnapshot;
  bubbleConfig: Pick<BubbleConfig, "agents">;
  nowIso: string;
}): RoundRoleHistoryEntry[] {
  if (input.state.round_role_history.some((entry) => entry.round === 1)) {
    return input.state.round_role_history;
  }

  return [
    ...input.state.round_role_history,
    {
      round: 1,
      implementer: input.bubbleConfig.agents.implementer,
      reviewer: input.bubbleConfig.agents.reviewer,
      switched_at: input.nowIso
    }
  ];
}

export function buildKickoffNextState(
  input: BuildKickoffNextStateInput
): BubbleStateSnapshot {
  const currentPersisted = toPersistedSnapshot(input.state);
  return assertParsedBubbleStateSnapshot({
    ...currentPersisted,
    state: "RUNNING",
    round: 1,
    active_agent: input.bubbleConfig.agents.implementer,
    active_role: "implementer",
    execution_context: buildRunningExecutionContext({
      bubbleId: currentPersisted.bubble_id,
      round: 1,
      activeRole: "implementer",
      startedAt: input.nowIso,
      watchdogTimeoutMinutes: input.bubbleConfig.watchdog_timeout_minutes
    }),
    active_since: input.nowIso,
    last_command_at: input.nowIso,
    round_role_history: buildKickoffRoundOneRoleHistory({
      state: input.state,
      bubbleConfig: input.bubbleConfig,
      nowIso: input.nowIso
    })
  });
}
