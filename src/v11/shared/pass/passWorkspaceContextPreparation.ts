import {
  IDEATION_PASS_BLOCKED
} from "../ideation/ideationReasonCodes.js";
import {
  resolveIdeationMetadata as resolveV11IdeationMetadata
} from "../../domain/ideation/ideationMetadata.js";
import {
  ensureBubbleInstanceIdForMutation,
  type EnsureBubbleInstanceIdForMutationResult
} from "../../infrastructure/artifact/bubble/bubbleInstanceId.js";
import {
  resolveBubbleFromWorkspaceCwd,
  type ResolvedBubbleWorkspace
} from "../../infrastructure/executor/workspace/workspaceResolution.js";
import { readStateSnapshot, type LoadedStateSnapshot } from "../../infrastructure/state/stateStore.js";
import type { ActorEmitContextSnapshot } from "../actorProtocol/actorEmitContext.js";
import { resolvePassHandoff, type ResolvedPassHandoff } from "../../domain/pass/handoff.js";
import type { AgentName, BubbleStateSnapshot } from "../../../types/bubble.js";

export interface PreparePassWorkspaceContextInput {
  cwd?: string | undefined;
  authoritativeContext?: ActorEmitContextSnapshot | undefined;
  now: Date;
  nowIso: string;
  createError: PairflowCreateCommandError;
}

export interface PreparePassWorkspaceContextDependencies {
  resolveBubbleFromWorkspaceCwd?: typeof resolveBubbleFromWorkspaceCwd;
  ensureBubbleInstanceIdForMutation?: typeof ensureBubbleInstanceIdForMutation;
  readStateSnapshot?: typeof readStateSnapshot;
  resolveIdeationMetadata?: typeof resolveV11IdeationMetadata;
  resolvePassHandoff?: typeof resolvePassHandoff;
}

export interface PreparedPassWorkspaceContext {
  resolved: ResolvedBubbleWorkspace;
  bubbleIdentity: EnsureBubbleInstanceIdForMutationResult;
  loadedState: LoadedStateSnapshot;
  state: BubbleStateSnapshot;
  handoff: ResolvedPassHandoff;
  implementer: AgentName;
  reviewer: AgentName;
}

export async function preparePassWorkspaceContext(
  input: PreparePassWorkspaceContextInput,
  dependencies: PreparePassWorkspaceContextDependencies = {}
): Promise<PreparedPassWorkspaceContext> {
  const resolveBubble =
    dependencies.resolveBubbleFromWorkspaceCwd ?? resolveBubbleFromWorkspaceCwd;
  const ensureBubbleIdentity =
    dependencies.ensureBubbleInstanceIdForMutation ?? ensureBubbleInstanceIdForMutation;
  const readState = dependencies.readStateSnapshot ?? readStateSnapshot;
  const resolveIdeation =
    dependencies.resolveIdeationMetadata ?? resolveV11IdeationMetadata;
  const resolveHandoff = dependencies.resolvePassHandoff ?? resolvePassHandoff;

  const authoritativeResolved: ResolvedBubbleWorkspace | undefined =
    input.authoritativeContext === undefined
      ? undefined
      : {
          bubbleId: input.authoritativeContext.bubble_id,
          bubbleConfig: input.authoritativeContext.resolved.bubbleConfig,
          bubblePaths: input.authoritativeContext.resolved.bubblePaths,
          repoPath: input.authoritativeContext.repo,
          worktreePath: input.authoritativeContext.worktree_path,
          cwd: input.authoritativeContext.worktree_path
        };
  const resolved =
    authoritativeResolved
    ?? await resolveBubble(input.cwd);
  const bubbleIdentity = await ensureBubbleIdentity({
    bubbleId: resolved.bubbleId,
    repoPath: resolved.repoPath,
    bubblePaths: resolved.bubblePaths,
    bubbleConfig: resolved.bubbleConfig,
    now: input.now
  });
  resolved.bubbleConfig = bubbleIdentity.bubbleConfig;

  const loadedState =
    input.authoritativeContext?.loaded_state
    ?? await readState(resolved.bubblePaths.statePath);
  const state = loadedState.state;
  const ideationMetadata = resolveIdeation(resolved.bubbleConfig);
  if (
    state.state === "RUNNING" &&
    state.round === 0 &&
    ideationMetadata.mode &&
    ideationMetadata.taskPending
  ) {
    throw input.createError(
      `${IDEATION_PASS_BLOCKED}: ideation kickoff is required before PASS handoff.`
    );
  }

  const { implementer, reviewer } = resolved.bubbleConfig.agents;
  const handoff = resolveHandoff({
    state,
    implementer,
    reviewer,
    nowIso: input.nowIso,
    createError: input.createError
  });

  return {
    resolved,
    bubbleIdentity,
    loadedState,
    state,
    handoff,
    implementer,
    reviewer
  };
}
