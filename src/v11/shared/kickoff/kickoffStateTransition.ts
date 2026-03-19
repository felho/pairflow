import { assertValidBubbleStateSnapshot } from "../../../core/state/stateSchema.js";
import type { BubbleConfig, BubbleStateSnapshot } from "../../../types/bubble.js";

export interface BuildKickoffNextStateInput {
  state: BubbleStateSnapshot;
  bubbleConfig: Pick<BubbleConfig, "agents">;
  nowIso: string;
}

function buildKickoffRoundOneRoleHistory(input: {
  state: BubbleStateSnapshot;
  bubbleConfig: Pick<BubbleConfig, "agents">;
  nowIso: string;
}): BubbleStateSnapshot["round_role_history"] {
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
  return assertValidBubbleStateSnapshot({
    ...input.state,
    round: 1,
    active_agent: input.bubbleConfig.agents.implementer,
    active_role: "implementer",
    active_since: input.nowIso,
    last_command_at: input.nowIso,
    round_role_history: buildKickoffRoundOneRoleHistory({
      state: input.state,
      bubbleConfig: input.bubbleConfig,
      nowIso: input.nowIso
    })
  });
}
