import type {
  AgentName,
  AgentRole
} from "../../../../contracts/kernel/agentIdentity.js";
import type { BubbleExecutionContext } from "../execution/executionContextTypes.js";
import { discriminateBubbleStateSnapshotKind } from "../authority/kindDiscrimination.js";
import type {
  BubbleStateSnapshot,
  BubbleStateSnapshotKind
} from "./bubbleStateSnapshot.js";
import type { PersistedBubbleStateSnapshot } from "./persistedBubbleStateSnapshot.js";

// Authority validation runs before this builder and guarantees the
// cross-field invariants that the variant types make implicit. The casts
// below mirror those guarantees so the variant's tighter active_* and
// execution_context types hold without re-doing the runtime checks.

export function buildBubbleStateSnapshotVariant(
  persisted: PersistedBubbleStateSnapshot
): BubbleStateSnapshot {
  const kind: BubbleStateSnapshotKind = discriminateBubbleStateSnapshotKind(persisted);

  const commonOptional: Pick<
    PersistedBubbleStateSnapshot,
    "pending_rework_intent" | "rework_intent_history" | "meta_review"
  > = {};
  if (persisted.pending_rework_intent !== undefined) {
    commonOptional.pending_rework_intent = persisted.pending_rework_intent;
  }
  if (persisted.rework_intent_history !== undefined) {
    commonOptional.rework_intent_history = persisted.rework_intent_history;
  }
  if (persisted.meta_review !== undefined) {
    commonOptional.meta_review = persisted.meta_review;
  }

  const required = {
    bubble_id: persisted.bubble_id,
    round: persisted.round,
    round_role_history: persisted.round_role_history,
    last_command_at: persisted.last_command_at
  };

  switch (kind) {
    case "inactive_initial":
      return {
        ...required,
        ...commonOptional,
        kind,
        state: persisted.state as "CREATED" | "PREPARING_WORKSPACE",
        active_agent: null,
        active_role: null,
        active_since: null,
        execution_context: null
      };
    case "running_ideation":
      return {
        ...required,
        ...commonOptional,
        kind,
        state: "RUNNING",
        round: 0,
        active_agent: persisted.active_agent as AgentName,
        active_role: persisted.active_role as Exclude<AgentRole, "meta_reviewer">,
        active_since: persisted.active_since as string,
        execution_context: null
      };
    case "running_standard":
      return {
        ...required,
        ...commonOptional,
        kind,
        state: "RUNNING",
        active_agent: persisted.active_agent as AgentName,
        active_role: persisted.active_role as Exclude<AgentRole, "meta_reviewer">,
        active_since: persisted.active_since as string,
        execution_context: persisted.execution_context as BubbleExecutionContext
      };
    case "running_meta_review":
      return {
        ...required,
        ...commonOptional,
        kind,
        state: "RUNNING",
        active_agent: persisted.active_agent as AgentName,
        active_role: "meta_reviewer",
        active_since: persisted.active_since as string,
        execution_context: persisted.execution_context as BubbleExecutionContext
      };
    case "waiting_human":
      return {
        ...required,
        ...commonOptional,
        kind,
        state: "WAITING_HUMAN",
        active_agent: persisted.active_agent as AgentName,
        active_role: persisted.active_role as AgentRole,
        active_since: persisted.active_since as string,
        execution_context: null
      };
    case "ready_for_approval":
      return {
        ...required,
        ...commonOptional,
        kind,
        state: "READY_FOR_HUMAN_APPROVAL",
        active_agent: persisted.active_agent as AgentName,
        active_role: persisted.active_role as AgentRole,
        active_since: persisted.active_since as string,
        execution_context: null
      };
    case "terminal_clean":
      return {
        ...required,
        ...commonOptional,
        kind,
        state: persisted.state as "APPROVED_FOR_COMMIT" | "COMMITTED" | "DONE",
        active_agent: null,
        active_role: null,
        active_since: null,
        execution_context: null
      };
    case "terminal_failed":
      return {
        ...required,
        ...commonOptional,
        kind,
        state: persisted.state as "FAILED" | "CANCELLED",
        active_agent: null,
        active_role: null,
        active_since: null,
        execution_context: null
      };
  }
}
