import { assertValidBubbleStateSnapshot } from "../../../core/state/stateSchema.js";
import type { BubbleConfig, BubbleStateSnapshot } from "../../../types/bubble.js";

export interface BuildKickoffNextStateInput {
  state: BubbleStateSnapshot;
  bubbleConfig: Pick<BubbleConfig, "agents">;
  nowIso: string;
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
    round_role_history: input.state.round_role_history.some((entry) => entry.round === 1)
      ? input.state.round_role_history
      : [
          ...input.state.round_role_history,
          {
            round: 1,
            implementer: input.bubbleConfig.agents.implementer,
            reviewer: input.bubbleConfig.agents.reviewer,
            switched_at: input.nowIso
          }
        ]
  });
}
