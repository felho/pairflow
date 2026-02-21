import type { BubbleStateSnapshot } from "../../types/bubble.js";

export function createInitialBubbleState(bubbleId: string): BubbleStateSnapshot {
  return {
    bubble_id: bubbleId,
    state: "CREATED",
    round: 0,
    active_agent: null,
    active_since: null,
    active_role: null,
    round_role_history: [],
    last_command_at: null
  };
}
