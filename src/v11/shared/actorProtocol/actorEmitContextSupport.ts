import type { AgentRole, BubbleExecutionContext } from "../../../types/bubble.js";
import type { ResolvedBubbleById } from "../../ports/bubbleLookup.js";
import type { LoadedStateSnapshot } from "../../ports/stateSnapshots.js";

export type ActorEmitContextErrorReasonCode =
  | "ACTOR_EMIT_COMPAT_ADAPTER_INVALID"
  | "ACTOR_EMIT_CONTEXT_INVALID"
  | "ACTOR_EMIT_CONTEXT_MISSING_EXECUTION_CONTEXT"
  | "ACTOR_EMIT_CONTEXT_PRE_E1_EXECUTION_ID_MISSING"
  | "ACTOR_EMIT_CONTEXT_EXECUTION_ID_MISSING"
  | "ACTOR_EMIT_INPUT_EXECUTION_ID_MISSING"
  | "ACTOR_EMIT_FORBIDDEN_EXECUTION_ID_DERIVATION";

export interface ActorEmitContextErrorContext {
  route?: string | undefined;
  expectedAuthority?: string | undefined;
  receivedKind?: string | undefined;
  receivedHandler?: string | undefined;
}

export interface ActorEmitContextErrorInput {
  reasonCode: ActorEmitContextErrorReasonCode;
  message: string;
  context?: ActorEmitContextErrorContext | undefined;
}

export class ActorEmitContextError extends Error {
  public readonly reasonCode: ActorEmitContextErrorReasonCode;
  public readonly context: ActorEmitContextErrorContext | undefined;

  public constructor(
    reasonCode: ActorEmitContextErrorReasonCode | ActorEmitContextErrorInput,
    message?: string,
    context?: ActorEmitContextErrorContext
  ) {
    const normalized =
      typeof reasonCode === "string"
        ? {
          reasonCode,
          message: message ?? "",
          context
        }
        : reasonCode;
    super(normalized.message);
    this.name = "ActorEmitContextError";
    this.reasonCode = normalized.reasonCode;
    this.context = normalized.context;
  }
}

export interface ActorEmitContextSnapshot {
  repo: string;
  bubble_id: string;
  handoff_id: string;
  execution_id: string;
  expected_role: AgentRole;
  expected_round: number;
  expected_state_fingerprint: string;
  worktree_path: string;
  resolved: ResolvedBubbleById;
  loaded_state: LoadedStateSnapshot;
  execution_context: BubbleExecutionContext;
}

export type ActorActivationProvenance = Pick<
  ActorEmitContextSnapshot,
  | "handoff_id"
  | "execution_id"
  | "expected_role"
  | "expected_round"
  | "expected_state_fingerprint"
>;

export function assertExecutionContext(
  state: LoadedStateSnapshot["state"],
  reasonCode: ActorEmitContextErrorReasonCode
): BubbleExecutionContext {
  if (
    state.execution_context === null ||
    state.execution_context === undefined
  ) {
    throw new ActorEmitContextError({
      reasonCode,
      message:
        `Active actor authority is unavailable for state ${state.state}; cannot materialize canonical actor emit context.`,
      context: {
        route: "assert_execution_context",
        expectedAuthority: "execution_context",
        receivedKind: state.state
      }
    });
  }

  return state.execution_context;
}

export function resolveExecutionContextExecutionId(input: {
  executionContext: BubbleExecutionContext;
}): {
  hasExecutionId: boolean;
  executionId: unknown;
} {
  const executionContextRecord = input.executionContext as BubbleExecutionContext & {
    execution_id?: unknown;
  };

  return {
    hasExecutionId: Object.hasOwn(executionContextRecord, "execution_id"),
    executionId: executionContextRecord.execution_id
  };
}

export function assertExecutionContextHasExecutionId(
  executionContext: BubbleExecutionContext
): string {
  const { hasExecutionId, executionId } = resolveExecutionContextExecutionId({
    executionContext
  });
  if (!hasExecutionId) {
    throw new ActorEmitContextError({
      reasonCode: "ACTOR_EMIT_CONTEXT_PRE_E1_EXECUTION_ID_MISSING",
      message:
        "ACTOR_EMIT_CONTEXT_PRE_E1_EXECUTION_ID_MISSING: persisted execution_context is missing execution_id; fresh authority remint required.",
      context: {
        route: "assert_execution_context_has_execution_id",
        expectedAuthority: "execution_id",
        receivedKind: "missing"
      }
    });
  }
  if (
    typeof executionId !== "string" ||
    executionId.trim().length === 0
  ) {
    throw new ActorEmitContextError({
      reasonCode: "ACTOR_EMIT_CONTEXT_EXECUTION_ID_MISSING",
      message:
        "ACTOR_EMIT_CONTEXT_EXECUTION_ID_MISSING: canonical execution_context requires a non-empty execution_id.",
      context: {
        route: "assert_execution_context_has_execution_id",
        expectedAuthority: "execution_id",
        receivedKind: typeof executionId
      }
    });
  }
  return executionId;
}

export function hasDistinctExecutionAuthority(input: {
  handoffId: string;
  executionId: string;
}): boolean {
  return input.executionId !== input.handoffId;
}

export function buildOptionalActorActivationProvenance(input: {
  authoritativeContext?: ActorActivationProvenance;
  loadedState: Pick<LoadedStateSnapshot, "fingerprint" | "state">;
}): ActorActivationProvenance | undefined {
  const executionContext = input.loadedState.state.execution_context;
  if (executionContext === null || executionContext === undefined) {
    return undefined;
  }
  if (
    input.loadedState.state.active_role !== executionContext.active_role ||
    input.loadedState.state.round !== executionContext.round
  ) {
    return undefined;
  }

  const { hasExecutionId, executionId } = resolveExecutionContextExecutionId({
    executionContext
  });
  if (
    !hasExecutionId ||
    typeof executionId !== "string" ||
    executionId.trim().length === 0
  ) {
    return undefined;
  }
  if (
    !hasDistinctExecutionAuthority({
      handoffId: executionContext.handoff_id,
      executionId
    })
  ) {
    return undefined;
  }

  if (input.authoritativeContext !== undefined) {
    return {
      handoff_id: input.authoritativeContext.handoff_id,
      execution_id: input.authoritativeContext.execution_id,
      expected_role: input.authoritativeContext.expected_role,
      expected_round: input.authoritativeContext.expected_round,
      expected_state_fingerprint:
        input.authoritativeContext.expected_state_fingerprint
    };
  }

  return {
    handoff_id: executionContext.handoff_id,
    execution_id: executionId,
    expected_role: executionContext.active_role,
    expected_round: executionContext.round,
    expected_state_fingerprint: input.loadedState.fingerprint
  };
}

export function buildActorEmitContextSnapshot(input: {
  resolved: ResolvedBubbleById;
  loadedState: LoadedStateSnapshot;
  reasonCode: ActorEmitContextErrorReasonCode;
}): ActorEmitContextSnapshot {
  const executionContext = assertExecutionContext(
    input.loadedState.state,
    input.reasonCode === "ACTOR_EMIT_COMPAT_ADAPTER_INVALID"
      ? input.reasonCode
      : "ACTOR_EMIT_CONTEXT_MISSING_EXECUTION_CONTEXT"
  );
  const executionId = assertExecutionContextHasExecutionId(executionContext);
  if (
    !hasDistinctExecutionAuthority({
      handoffId: executionContext.handoff_id,
      executionId
    })
  ) {
    throw new ActorEmitContextError({
      reasonCode: input.reasonCode,
      message:
        "ACTOR_EMIT_FORBIDDEN_EXECUTION_ID_DERIVATION: execution_id must not be derived from or reused as handoff_id.",
      context: {
        route: "build_actor_emit_context_snapshot",
        expectedAuthority: "distinct_execution_id",
        receivedKind: "handoff_id_reused"
      }
    });
  }
  const liveRole = input.loadedState.state.active_role;
  if (
    liveRole !== null &&
    liveRole !== undefined &&
    liveRole !== executionContext.active_role
  ) {
    throw new ActorEmitContextError({
      reasonCode: input.reasonCode,
      message:
        `Active actor role is incoherent with execution context (state: ${liveRole}, execution context: ${executionContext.active_role}).`,
      context: {
        route: "build_actor_emit_context_snapshot",
        expectedAuthority: executionContext.active_role,
        receivedKind: liveRole
      }
    });
  }

  return {
    repo: input.resolved.repoPath,
    bubble_id: input.resolved.bubbleId,
    handoff_id: executionContext.handoff_id,
    execution_id: executionId,
    expected_role: executionContext.active_role,
    expected_round: executionContext.round,
    expected_state_fingerprint: input.loadedState.fingerprint,
    worktree_path: input.resolved.bubblePaths.worktreePath,
    resolved: input.resolved,
    loaded_state: input.loadedState,
    execution_context: executionContext
  };
}
