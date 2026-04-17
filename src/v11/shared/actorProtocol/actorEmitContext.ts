import type { AgentRole, BubbleExecutionContext } from "../../../types/bubble.js";
import type { ResolvedBubbleById } from "../ports/bubbleLookup.js";
import type { LoadedStateSnapshot } from "../ports/stateSnapshots.js";
import { resolveBubbleById } from "../bubbleLookup/bubbleLookupDefaults.js";
import { readStateSnapshot } from "../state/stateStoreDefaults.js";
import { resolveBubbleFromWorkspaceCwd } from "../../defaults/workspace/workspaceResolutionDefaults.js";

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

function assertExecutionContext(
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

function resolveExecutionContextExecutionId(input: {
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

function assertExecutionContextHasExecutionId(
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
    typeof executionId !== "string"
    || executionId.trim().length === 0
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

function hasDistinctExecutionAuthority(input: {
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
    input.loadedState.state.active_role !== executionContext.active_role
    || input.loadedState.state.round !== executionContext.round
  ) {
    return undefined;
  }

  const { hasExecutionId, executionId } = resolveExecutionContextExecutionId({
    executionContext
  });
  if (
    !hasExecutionId
    || typeof executionId !== "string"
    || executionId.trim().length === 0
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

function buildActorEmitContextSnapshot(input: {
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

async function loadActorEmitContextFromResolvedBubble(
  resolved: ResolvedBubbleById,
  reasonCode: ActorEmitContextErrorReasonCode
): Promise<ActorEmitContextSnapshot> {
  const loadedState = await readStateSnapshot(
    resolved.bubblePaths.statePath
  );
  return buildActorEmitContextSnapshot({
    resolved,
    loadedState,
    reasonCode
  });
}

export async function resolveCompatActorEmitContextFromWorkspace(
  cwd: string = process.cwd()
): Promise<ActorEmitContextSnapshot> {
  const workspace = await resolveBubbleFromWorkspaceCwd(cwd);
  const resolved = await resolveBubbleById({
    bubbleId: workspace.bubbleId,
    repoPath: workspace.repoPath
  });

  return loadActorEmitContextFromResolvedBubble(
    resolved,
    "ACTOR_EMIT_COMPAT_ADAPTER_INVALID"
  );
}

export async function resolveActorEmitContextByBubbleId(input: {
  bubbleId: string;
  repoPath?: string;
  cwd?: string;
}): Promise<ActorEmitContextSnapshot> {
  const resolved = await resolveBubbleById({
    bubbleId: input.bubbleId,
    ...(input.repoPath !== undefined ? { repoPath: input.repoPath } : {}),
    ...(input.cwd !== undefined ? { cwd: input.cwd } : {})
  });
  return loadActorEmitContextFromResolvedBubble(
    resolved,
    "ACTOR_EMIT_CONTEXT_INVALID"
  );
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
    throw new ActorEmitContextError({
      reasonCode: "ACTOR_EMIT_FORBIDDEN_EXECUTION_ID_DERIVATION",
      message:
        "ACTOR_EMIT_FORBIDDEN_EXECUTION_ID_DERIVATION: canonical actor emit requires an explicit execution_id; handoff_id cannot be used as a substitute.",
      context: {
        route: "assert_actor_emit_context_matches",
        expectedAuthority: "execution_id",
        receivedKind: "empty"
      }
    });
  }

  if (input.executionId === input.handoffId) {
    throw new ActorEmitContextError({
      reasonCode: "ACTOR_EMIT_FORBIDDEN_EXECUTION_ID_DERIVATION",
      message:
        "ACTOR_EMIT_FORBIDDEN_EXECUTION_ID_DERIVATION: execution_id must not be derived from or reused as handoff_id.",
      context: {
        route: "assert_actor_emit_context_matches",
        expectedAuthority: "distinct_execution_id",
        receivedKind: "handoff_id_reused"
      }
    });
  }

  if (input.context.handoff_id !== input.handoffId) {
    throw new ActorEmitContextError({
      reasonCode: "ACTOR_EMIT_CONTEXT_INVALID",
      message:
        `Canonical actor emit handoff mismatch: expected ${input.handoffId}, active ${input.context.handoff_id}.`,
      context: {
        route: "assert_actor_emit_context_matches",
        expectedAuthority: input.handoffId,
        receivedKind: input.context.handoff_id
      }
    });
  }

  if (input.context.execution_id !== input.executionId) {
    throw new ActorEmitContextError({
      reasonCode: "ACTOR_EMIT_CONTEXT_INVALID",
      message:
        `Canonical actor emit execution mismatch: expected ${input.executionId}, active ${input.context.execution_id}.`,
      context: {
        route: "assert_actor_emit_context_matches",
        expectedAuthority: input.executionId,
        receivedKind: input.context.execution_id
      }
    });
  }

  if (
    input.expectedRole !== undefined &&
    input.context.expected_role !== input.expectedRole
  ) {
    throw new ActorEmitContextError({
      reasonCode: "ACTOR_EMIT_CONTEXT_INVALID",
      message:
        `Canonical actor emit role mismatch: expected ${input.expectedRole}, active ${input.context.expected_role}.`,
      context: {
        route: "assert_actor_emit_context_matches",
        expectedAuthority: input.expectedRole,
        receivedKind: input.context.expected_role
      }
    });
  }

  if (
    input.expectedRound !== undefined &&
    input.context.expected_round !== input.expectedRound
  ) {
    throw new ActorEmitContextError({
      reasonCode: "ACTOR_EMIT_CONTEXT_INVALID",
      message:
        `Canonical actor emit round mismatch: expected ${String(input.expectedRound)}, active ${String(input.context.expected_round)}.`,
      context: {
        route: "assert_actor_emit_context_matches",
        expectedAuthority: String(input.expectedRound),
        receivedKind: String(input.context.expected_round)
      }
    });
  }

  if (
    input.expectedStateFingerprint !== undefined &&
    input.context.expected_state_fingerprint !== input.expectedStateFingerprint
  ) {
    throw new ActorEmitContextError({
      reasonCode: "ACTOR_EMIT_CONTEXT_INVALID",
      message: "Canonical actor emit state fingerprint mismatch.",
      context: {
        route: "assert_actor_emit_context_matches",
        expectedAuthority: input.expectedStateFingerprint,
        receivedKind: input.context.expected_state_fingerprint
      }
    });
  }
}

export function assertActorEmitContextSnapshotIntegrity(
  context: ActorEmitContextSnapshot
): void {
  const mismatchRoute = "assert_actor_emit_context_snapshot_integrity";
  const state = context.loaded_state.state;

  if (state.bubble_id !== context.bubble_id) {
    throw new ActorEmitContextError({
      reasonCode: "ACTOR_EMIT_CONTEXT_INVALID",
      message:
        `Canonical actor emit snapshot bubble mismatch: expected ${context.bubble_id}, loaded ${state.bubble_id}.`,
      context: {
        route: mismatchRoute,
        expectedAuthority: context.bubble_id,
        receivedKind: state.bubble_id
      }
    });
  }

  if (context.resolved.bubbleId !== context.bubble_id) {
    throw new ActorEmitContextError({
      reasonCode: "ACTOR_EMIT_CONTEXT_INVALID",
      message:
        `Canonical actor emit resolved bubble mismatch: expected ${context.bubble_id}, resolved ${context.resolved.bubbleId}.`,
      context: {
        route: mismatchRoute,
        expectedAuthority: context.bubble_id,
        receivedKind: context.resolved.bubbleId
      }
    });
  }

  if (context.resolved.repoPath !== context.repo) {
    throw new ActorEmitContextError({
      reasonCode: "ACTOR_EMIT_CONTEXT_INVALID",
      message:
        `Canonical actor emit repo mismatch: expected ${context.repo}, resolved ${context.resolved.repoPath}.`,
      context: {
        route: mismatchRoute,
        expectedAuthority: context.repo,
        receivedKind: context.resolved.repoPath
      }
    });
  }

  if (context.resolved.bubblePaths.worktreePath !== context.worktree_path) {
    throw new ActorEmitContextError({
      reasonCode: "ACTOR_EMIT_CONTEXT_INVALID",
      message:
        `Canonical actor emit worktree mismatch: expected ${context.worktree_path}, resolved ${context.resolved.bubblePaths.worktreePath}.`,
      context: {
        route: mismatchRoute,
        expectedAuthority: context.worktree_path,
        receivedKind: context.resolved.bubblePaths.worktreePath
      }
    });
  }

  if (context.loaded_state.fingerprint !== context.expected_state_fingerprint) {
    throw new ActorEmitContextError({
      reasonCode: "ACTOR_EMIT_CONTEXT_INVALID",
      message:
        `Canonical actor emit fingerprint mismatch: expected ${context.expected_state_fingerprint}, loaded ${context.loaded_state.fingerprint}.`,
      context: {
        route: mismatchRoute,
        expectedAuthority: context.expected_state_fingerprint,
        receivedKind: context.loaded_state.fingerprint
      }
    });
  }

  const executionContext = assertExecutionContext(
    state,
    "ACTOR_EMIT_CONTEXT_INVALID"
  );
  let executionId: string;
  try {
    executionId = assertExecutionContextHasExecutionId(executionContext);
  } catch (error) {
    if (error instanceof ActorEmitContextError) {
      throw new ActorEmitContextError({
        reasonCode: "ACTOR_EMIT_CONTEXT_INVALID",
        message:
          `${error.message} (snapshot integrity route requires ACTOR_EMIT_CONTEXT_INVALID normalization).`,
        context: {
          route: mismatchRoute,
          expectedAuthority: "execution_id",
          receivedKind:
            error.context?.receivedKind
            ?? executionContext.active_role
        }
      });
    }
    throw error;
  }

  if (executionContext.handoff_id !== context.handoff_id) {
    throw new ActorEmitContextError({
      reasonCode: "ACTOR_EMIT_CONTEXT_INVALID",
      message:
        `Canonical actor emit snapshot handoff mismatch: expected ${context.handoff_id}, loaded ${executionContext.handoff_id}.`,
      context: {
        route: mismatchRoute,
        expectedAuthority: context.handoff_id,
        receivedKind: executionContext.handoff_id
      }
    });
  }

  if (executionId !== context.execution_id) {
    throw new ActorEmitContextError({
      reasonCode: "ACTOR_EMIT_CONTEXT_INVALID",
      message:
        `Canonical actor emit snapshot execution mismatch: expected ${context.execution_id}, loaded ${executionId}.`,
      context: {
        route: mismatchRoute,
        expectedAuthority: context.execution_id,
        receivedKind: executionId
      }
    });
  }
  if (
    !hasDistinctExecutionAuthority({
      handoffId: context.handoff_id,
      executionId: context.execution_id
    })
  ) {
    throw new ActorEmitContextError({
      reasonCode: "ACTOR_EMIT_CONTEXT_INVALID",
      message:
        "ACTOR_EMIT_FORBIDDEN_EXECUTION_ID_DERIVATION: execution_id must not be derived from or reused as handoff_id. (snapshot integrity route requires ACTOR_EMIT_CONTEXT_INVALID normalization).",
      context: {
        route: mismatchRoute,
        expectedAuthority: "distinct_execution_id",
        receivedKind: "handoff_id_reused"
      }
    });
  }

  if (executionContext.round !== context.expected_round) {
    throw new ActorEmitContextError({
      reasonCode: "ACTOR_EMIT_CONTEXT_INVALID",
      message:
        `Canonical actor emit snapshot round mismatch: expected ${context.expected_round}, loaded ${String(executionContext.round)}.`,
      context: {
        route: mismatchRoute,
        expectedAuthority: String(context.expected_round),
        receivedKind: String(executionContext.round)
      }
    });
  }

  if (executionContext.active_role !== context.expected_role) {
    throw new ActorEmitContextError({
      reasonCode: "ACTOR_EMIT_CONTEXT_INVALID",
      message:
        `Canonical actor emit snapshot role mismatch: expected ${context.expected_role}, loaded ${executionContext.active_role}.`,
      context: {
        route: mismatchRoute,
        expectedAuthority: context.expected_role,
        receivedKind: executionContext.active_role
      }
    });
  }
}
