import type { AgentRole, BubbleExecutionContext } from "../../../types/bubble.js";
import type { ResolvedBubbleById } from "../ports/bubbleLookup.js";
import type { LoadedStateSnapshot } from "../ports/stateSnapshots.js";
import { resolveBubbleById } from "../bubbleLookup/bubbleLookupDefaults.js";
import { readStateSnapshot } from "../state/stateStoreDefaults.js";
import { resolveBubbleFromWorkspaceCwd } from "../../defaults/workspace/workspaceResolutionDefaults.js";

export type ActorEmitContextErrorReasonCode =
  | "ACTOR_EMIT_COMPAT_ADAPTER_INVALID"
  | "ACTOR_EMIT_CONTEXT_INVALID";

export interface ActorEmitContextErrorContext {
  route?: string | undefined;
  expectedAuthority?: string | undefined;
  receivedKind?: string | undefined;
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
  expected_role: AgentRole;
  expected_round: number;
  expected_state_fingerprint: string;
  worktree_path: string;
  resolved: ResolvedBubbleById;
  loaded_state: LoadedStateSnapshot;
  execution_context: BubbleExecutionContext;
}

function assertExecutionContext(
  state: LoadedStateSnapshot["state"],
  reasonCode: ActorEmitContextErrorReasonCode
): BubbleExecutionContext {
  if (
    state.execution_context === null ||
    state.execution_context === undefined
  ) {
    throw new ActorEmitContextError(
      reasonCode,
      `Active actor authority is unavailable for state ${state.state}; cannot materialize canonical actor emit context.`
    );
  }

  return state.execution_context;
}

function buildActorEmitContextSnapshot(input: {
  resolved: ResolvedBubbleById;
  loadedState: LoadedStateSnapshot;
  reasonCode: ActorEmitContextErrorReasonCode;
}): ActorEmitContextSnapshot {
  const executionContext = assertExecutionContext(
    input.loadedState.state,
    input.reasonCode
  );
  const liveRole = input.loadedState.state.active_role;
  if (
    liveRole !== null &&
    liveRole !== undefined &&
    liveRole !== executionContext.active_role
  ) {
    throw new ActorEmitContextError(
      input.reasonCode,
      `Active actor role is incoherent with execution context (state: ${liveRole}, execution context: ${executionContext.active_role}).`
    );
  }

  return {
    repo: input.resolved.repoPath,
    bubble_id: input.resolved.bubbleId,
    handoff_id: executionContext.handoff_id,
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
  expectedRole?: AgentRole;
  expectedRound?: number;
  expectedStateFingerprint?: string;
}): void {
  if (input.context.handoff_id !== input.handoffId) {
    throw new ActorEmitContextError(
      "ACTOR_EMIT_CONTEXT_INVALID",
      `Canonical actor emit handoff mismatch: expected ${input.handoffId}, active ${input.context.handoff_id}.`
    );
  }

  if (
    input.expectedRole !== undefined &&
    input.context.expected_role !== input.expectedRole
  ) {
    throw new ActorEmitContextError(
      "ACTOR_EMIT_CONTEXT_INVALID",
      `Canonical actor emit role mismatch: expected ${input.expectedRole}, active ${input.context.expected_role}.`
    );
  }

  if (
    input.expectedRound !== undefined &&
    input.context.expected_round !== input.expectedRound
  ) {
    throw new ActorEmitContextError(
      "ACTOR_EMIT_CONTEXT_INVALID",
      `Canonical actor emit round mismatch: expected ${String(input.expectedRound)}, active ${String(input.context.expected_round)}.`
    );
  }

  if (
    input.expectedStateFingerprint !== undefined &&
    input.context.expected_state_fingerprint !== input.expectedStateFingerprint
  ) {
    throw new ActorEmitContextError(
      "ACTOR_EMIT_CONTEXT_INVALID",
      "Canonical actor emit state fingerprint mismatch."
    );
  }
}
