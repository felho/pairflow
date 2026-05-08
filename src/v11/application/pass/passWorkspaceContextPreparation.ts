import type { LoadedStateSnapshot } from "../../ports/stateSnapshots.js";
import type {
  EnsureBubbleInstanceIdForMutationResult
} from "../../ports/bubbleIdentity.js";
import type {
  ResolvedBubbleWorkspace
} from "../../ports/workspaceResolution.js";
import {
  IDEATION_PASS_BLOCKED
} from "../../shared/ideation/ideationReasonCodes.js";
import {
  buildOptionalActorActivationProvenance,
  type ActorActivationProvenance,
} from "../../shared/actorProtocol/actorEmitContext.js";
import {
  buildPassPathReviewPolicyRuntimeView
} from "../../shared/reviewPolicy/reviewPolicyRuntime.js";
import type {
  BubbleReviewPolicyRuntimeView
} from "../../shared/reviewPolicy/reviewPolicyTypes.js";
import {
  assertActorEmitContextSnapshotIntegrity
} from "../../shared/actorProtocol/actorEmitContext.js";
import type { ActorEmitContextSnapshot } from "../../shared/actorProtocol/actorEmitContext.js";
import type { AgentName } from "../../../contracts/kernel/agentIdentity.js";
import type { BubbleStateSnapshot } from "../../shared/state/bubbleStateSnapshotTypes.js";
import {
  resolveIdeationMetadata as resolveV11IdeationMetadata
} from "../../domain/ideation/ideationMetadata.js";
import { resolvePassHandoff, type ResolvedPassHandoff } from "../../domain/pass/handoff.js";
import {
  ensureBubbleInstanceIdForMutation,
  readStateSnapshot,
  resolveBubbleFromWorkspaceCwd
} from "../start/startCommandDependencyDefaults.js";

export interface PreparePassWorkspaceContextInput {
  cwd?: string | undefined;
  authoritativeContext?: ActorEmitContextSnapshot | undefined;
  now: Date;
  nowIso: string;
  createError: PairflowCreateCommandError;
}

export interface PreparePassWorkspaceContextDependencies {
  resolveBubbleFromWorkspaceCwd?:
    typeof resolveBubbleFromWorkspaceCwd;
  ensureBubbleInstanceIdForMutation?:
    typeof ensureBubbleInstanceIdForMutation;
  readStateSnapshot?: typeof readStateSnapshot;
  resolveIdeationMetadata?: typeof resolveV11IdeationMetadata;
  resolvePassHandoff?: typeof resolvePassHandoff;
}

export interface PreparedPassWorkspaceContext {
  resolved: ResolvedBubbleWorkspace;
  bubbleIdentity: EnsureBubbleInstanceIdForMutationResult;
  loadedState: LoadedStateSnapshot;
  state: BubbleStateSnapshot;
  activation?: ActorActivationProvenance;
  reviewPolicyRuntime: BubbleReviewPolicyRuntimeView;
  handoff: ResolvedPassHandoff;
  implementer: AgentName;
  reviewer: AgentName;
  metaReviewer: AgentName;
}

export async function preparePassWorkspaceContext(
  input: PreparePassWorkspaceContextInput,
  dependencies: PreparePassWorkspaceContextDependencies = {}
): Promise<PreparedPassWorkspaceContext> {
  const resolveBubble =
    dependencies.resolveBubbleFromWorkspaceCwd
    ?? resolveBubbleFromWorkspaceCwd;
  const ensureBubbleIdentity =
    dependencies.ensureBubbleInstanceIdForMutation
    ?? ensureBubbleInstanceIdForMutation;
  const readState =
    dependencies.readStateSnapshot ?? readStateSnapshot;
  const resolveIdeation =
    dependencies.resolveIdeationMetadata ?? resolveV11IdeationMetadata;
  const resolveHandoff = dependencies.resolvePassHandoff ?? resolvePassHandoff;

  if (input.authoritativeContext !== undefined) {
    assertActorEmitContextSnapshotIntegrity(input.authoritativeContext);
  }

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

  const {
    implementer,
    reviewer,
    meta_reviewer: metaReviewer
  } = resolved.bubbleConfig.agents;
  const activation = buildOptionalActorActivationProvenance({
    ...(input.authoritativeContext !== undefined
      ? { authoritativeContext: input.authoritativeContext }
      : {}),
    loadedState
  });
  const reviewPolicyRuntime = buildPassPathReviewPolicyRuntimeView({
    config: resolved.bubbleConfig,
    activationProven: activation?.expected_role === "implementer"
  });
  const handoff = resolveHandoff({
    state,
    implementer,
    reviewer,
    metaReviewer,
    effectiveLoopMode: reviewPolicyRuntime.effective_loop_mode,
    nowIso: input.nowIso,
    createError: input.createError
  });

  return {
    resolved,
    bubbleIdentity,
    loadedState,
    state,
    ...(activation !== undefined ? { activation } : {}),
    reviewPolicyRuntime,
    handoff,
    implementer,
    reviewer,
    metaReviewer
  };
}
