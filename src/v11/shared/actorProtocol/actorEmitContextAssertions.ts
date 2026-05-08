import type {
  AgentRole
} from "../../domain/agentIdentity/agentIdentity.js";
import {
  ActorEmitContextError,
  assertExecutionContext,
  assertExecutionContextHasExecutionId,
  hasDistinctExecutionAuthority,
  type ActorEmitContextSnapshot
} from "./actorEmitContextSupport.js";

function throwActorEmitContextMismatch(input: {
  reasonCode: "ACTOR_EMIT_CONTEXT_INVALID" | "ACTOR_EMIT_FORBIDDEN_EXECUTION_ID_DERIVATION";
  message: string;
  expectedAuthority: string;
  receivedKind: string;
}): never {
  throw new ActorEmitContextError({
    reasonCode: input.reasonCode,
    message: input.message,
    context: {
      route: "assert_actor_emit_context_matches",
      expectedAuthority: input.expectedAuthority,
      receivedKind: input.receivedKind
    }
  });
}

function assertOptionalActorEmitFieldMatches(input: {
  actual: string | number;
  expected: string | number | undefined;
  message: string;
}): void {
  if (input.expected === undefined || input.actual === input.expected) {
    return;
  }

  throwActorEmitContextMismatch({
    reasonCode: "ACTOR_EMIT_CONTEXT_INVALID",
    message: input.message,
    expectedAuthority: String(input.expected),
    receivedKind: String(input.actual)
  });
}

export function assertActorEmitContextMatches(input: {
  context: ActorEmitContextSnapshot;
  handoffId: string;
  executionId: string;
  expectedRole?: AgentRole;
  expectedRound?: number;
  expectedStateFingerprint?: string;
}): void {
  if (input.executionId.trim().length === 0) {
    throwActorEmitContextMismatch({
      reasonCode: "ACTOR_EMIT_FORBIDDEN_EXECUTION_ID_DERIVATION",
      message:
        "ACTOR_EMIT_FORBIDDEN_EXECUTION_ID_DERIVATION: canonical actor emit requires an explicit execution_id; handoff_id cannot be used as a substitute.",
      expectedAuthority: "execution_id",
      receivedKind: "empty"
    });
  }

  if (input.executionId === input.handoffId) {
    throwActorEmitContextMismatch({
      reasonCode: "ACTOR_EMIT_FORBIDDEN_EXECUTION_ID_DERIVATION",
      message:
        "ACTOR_EMIT_FORBIDDEN_EXECUTION_ID_DERIVATION: execution_id must not be derived from or reused as handoff_id.",
      expectedAuthority: "distinct_execution_id",
      receivedKind: "handoff_id_reused"
    });
  }

  assertOptionalActorEmitFieldMatches({
    actual: input.context.handoff_id,
    expected: input.handoffId,
    message:
      `Canonical actor emit handoff mismatch: expected ${input.handoffId}, active ${input.context.handoff_id}.`
  });
  assertOptionalActorEmitFieldMatches({
    actual: input.context.execution_id,
    expected: input.executionId,
    message:
      `Canonical actor emit execution mismatch: expected ${input.executionId}, active ${input.context.execution_id}.`
  });
  assertOptionalActorEmitFieldMatches({
    actual: input.context.expected_role,
    expected: input.expectedRole,
    message:
      `Canonical actor emit role mismatch: expected ${input.expectedRole}, active ${input.context.expected_role}.`
  });
  assertOptionalActorEmitFieldMatches({
    actual: input.context.expected_round,
    expected: input.expectedRound,
    message:
      `Canonical actor emit round mismatch: expected ${String(input.expectedRound)}, active ${String(input.context.expected_round)}.`
  });
  assertOptionalActorEmitFieldMatches({
    actual: input.context.expected_state_fingerprint,
    expected: input.expectedStateFingerprint,
    message: "Canonical actor emit state fingerprint mismatch."
  });
}

const SNAPSHOT_INTEGRITY_ROUTE = "assert_actor_emit_context_snapshot_integrity";

function throwSnapshotIntegrityMismatch(input: {
  message: string;
  expectedAuthority: string;
  receivedKind: string;
}): never {
  throw new ActorEmitContextError({
    reasonCode: "ACTOR_EMIT_CONTEXT_INVALID",
    message: input.message,
    context: {
      route: SNAPSHOT_INTEGRITY_ROUTE,
      expectedAuthority: input.expectedAuthority,
      receivedKind: input.receivedKind
    }
  });
}

function assertSnapshotIntegrityField(input: {
  actual: string;
  expected: string;
  message: string;
}): void {
  if (input.actual === input.expected) {
    return;
  }

  throwSnapshotIntegrityMismatch({
    message: input.message,
    expectedAuthority: input.expected,
    receivedKind: input.actual
  });
}

function resolveIntegrityExecutionId(
  activeExecutionContext: ActorEmitContextSnapshot["execution_context"]
): string {
  try {
    return assertExecutionContextHasExecutionId(activeExecutionContext);
  } catch (error) {
    if (error instanceof ActorEmitContextError) {
      throwSnapshotIntegrityMismatch({
        message:
          `${error.message} (snapshot integrity route requires ACTOR_EMIT_CONTEXT_INVALID normalization).`,
        expectedAuthority: "execution_id",
        receivedKind:
          error.context?.receivedKind ??
          activeExecutionContext.active_role
      });
    }
    throw error;
  }
}

export function assertActorEmitContextSnapshotIntegrity(
  context: ActorEmitContextSnapshot
): void {
  const state = context.loaded_state.state;

  assertSnapshotIntegrityField({
    actual: state.bubble_id,
    expected: context.bubble_id,
    message:
      `Canonical actor emit snapshot bubble mismatch: expected ${context.bubble_id}, loaded ${state.bubble_id}.`
  });
  assertSnapshotIntegrityField({
    actual: context.resolved.bubbleId,
    expected: context.bubble_id,
    message:
      `Canonical actor emit resolved bubble mismatch: expected ${context.bubble_id}, resolved ${context.resolved.bubbleId}.`
  });
  assertSnapshotIntegrityField({
    actual: context.resolved.repoPath,
    expected: context.repo,
    message:
      `Canonical actor emit repo mismatch: expected ${context.repo}, resolved ${context.resolved.repoPath}.`
  });
  assertSnapshotIntegrityField({
    actual: context.resolved.bubblePaths.worktreePath,
    expected: context.worktree_path,
    message:
      `Canonical actor emit worktree mismatch: expected ${context.worktree_path}, resolved ${context.resolved.bubblePaths.worktreePath}.`
  });
  assertSnapshotIntegrityField({
    actual: context.loaded_state.fingerprint,
    expected: context.expected_state_fingerprint,
    message:
      `Canonical actor emit fingerprint mismatch: expected ${context.expected_state_fingerprint}, loaded ${context.loaded_state.fingerprint}.`
  });

  const activeExecutionContext = assertExecutionContext(
    state,
    "ACTOR_EMIT_CONTEXT_INVALID"
  );
  const executionId = resolveIntegrityExecutionId(activeExecutionContext);

  assertSnapshotIntegrityField({
    actual: activeExecutionContext.handoff_id,
    expected: context.handoff_id,
    message:
      `Canonical actor emit snapshot handoff mismatch: expected ${context.handoff_id}, loaded ${activeExecutionContext.handoff_id}.`
  });
  assertSnapshotIntegrityField({
    actual: executionId,
    expected: context.execution_id,
    message:
      `Canonical actor emit snapshot execution mismatch: expected ${context.execution_id}, loaded ${executionId}.`
  });
  if (
    !hasDistinctExecutionAuthority({
      handoffId: context.handoff_id,
      executionId: context.execution_id
    })
  ) {
    throwSnapshotIntegrityMismatch({
      message:
        "ACTOR_EMIT_FORBIDDEN_EXECUTION_ID_DERIVATION: execution_id must not be derived from or reused as handoff_id. (snapshot integrity route requires ACTOR_EMIT_CONTEXT_INVALID normalization).",
      expectedAuthority: "distinct_execution_id",
      receivedKind: "handoff_id_reused"
    });
  }
  if (activeExecutionContext.round !== context.expected_round) {
    throwSnapshotIntegrityMismatch({
      message:
        `Canonical actor emit snapshot round mismatch: expected ${context.expected_round}, loaded ${String(activeExecutionContext.round)}.`,
      expectedAuthority: String(context.expected_round),
      receivedKind: String(activeExecutionContext.round)
    });
  }
  assertSnapshotIntegrityField({
    actual: activeExecutionContext.active_role,
    expected: context.expected_role,
    message:
      `Canonical actor emit snapshot role mismatch: expected ${context.expected_role}, loaded ${activeExecutionContext.active_role}.`
  });
}
