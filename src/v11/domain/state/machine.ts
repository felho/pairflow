import type {
  AgentName,
  AgentRole
} from "../agentIdentity/agentIdentity.js";
import type { BubbleLifecycleState } from "./lifecycleTypes.js";
import type { BubbleStateSnapshot } from "../../../types/bubble.js";
import type {
  RoundRoleHistoryEntry
} from "../../shared/state/roundRoleHistoryTypes.js";
import { assertValidBubbleStateSnapshot } from "../../shared/state/stateSchema.js";
import { assertTransitionAllowed } from "./transitions.js";

export interface StateTransitionInput {
  to: BubbleLifecycleState;
  round?: number;
  activeAgent?: AgentName | null;
  activeRole?: AgentRole | null;
  executionContext?: BubbleStateSnapshot["execution_context"];
  activeSince?: string | null;
  lastCommandAt?: string | null;
  appendRoundRoleEntry?: RoundRoleHistoryEntry;
}

const statesThatClearExecutionContext = new Set<BubbleLifecycleState>([
  "CREATED",
  "PREPARING_WORKSPACE",
  "WAITING_HUMAN",
  "READY_FOR_HUMAN_APPROVAL",
  "APPROVED_FOR_COMMIT",
  "COMMITTED",
  "DONE",
  "FAILED",
  "CANCELLED"
]);

function clearCompatibilityMetaReviewExecutionContext(
  state: BubbleStateSnapshot
): BubbleStateSnapshot {
  if (
    state.meta_review === undefined ||
    state.active_role === "meta_reviewer" ||
    state.execution_context?.active_role === "meta_reviewer"
  ) {
    return state;
  }

  return {
    ...state,
    meta_review: {
      ...state.meta_review,
      execution_context: null
    }
  };
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
  if (input.executionContext !== undefined) {
    next.execution_context = input.executionContext;
  } else if (statesThatClearExecutionContext.has(input.to)) {
    next.execution_context = null;
  }
  if (input.activeSince !== undefined) {
    next.active_since = input.activeSince;
  }
  if (input.lastCommandAt !== undefined) {
    next.last_command_at = input.lastCommandAt;
  }

  return assertValidBubbleStateSnapshot(
    clearCompatibilityMetaReviewExecutionContext(next)
  );
}
