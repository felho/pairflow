import type {
  AgentName,
  AgentRole,
  BubbleLifecycleState,
  BubbleStateSnapshot,
  RoundRoleHistoryEntry
} from "../../types/bubble.js";
import { assertValidBubbleStateSnapshot } from "./stateSchema.js";
import { assertTransitionAllowed } from "./transitions.js";

export interface StateTransitionInput {
  to: BubbleLifecycleState;
  round?: number;
  activeAgent?: AgentName | null;
  activeRole?: AgentRole | null;
  activeSince?: string | null;
  lastCommandAt?: string | null;
  appendRoundRoleEntry?: RoundRoleHistoryEntry;
}

export function applyStateTransition(
  current: BubbleStateSnapshot,
  input: StateTransitionInput
): BubbleStateSnapshot {
  assertTransitionAllowed(current.state, input.to, current.bubble_id);

  const next: BubbleStateSnapshot = {
    ...current,
    state: input.to,
    round: input.round ?? current.round,
    round_role_history:
      input.appendRoundRoleEntry === undefined
        ? current.round_role_history
        : [...current.round_role_history, input.appendRoundRoleEntry]
  };

  // `null` means explicit clear, `undefined` means keep previous value.
  if (input.activeAgent !== undefined) {
    next.active_agent = input.activeAgent;
  }
  if (input.activeRole !== undefined) {
    next.active_role = input.activeRole;
  }
  if (input.activeSince !== undefined) {
    next.active_since = input.activeSince;
  }
  if (input.lastCommandAt !== undefined) {
    next.last_command_at = input.lastCommandAt;
  }

  return assertValidBubbleStateSnapshot(next);
}
