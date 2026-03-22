import {
  IDEATION_PASS_BLOCKED,
  resolveIdeationMetadata
} from "../../../core/bubble/ideation.js";
import {
  ensureBubbleInstanceIdForMutation,
  type EnsureBubbleInstanceIdForMutationResult
} from "../../../core/bubble/bubbleInstanceId.js";
import {
  resolveBubbleFromWorkspaceCwd,
  type ResolvedBubbleWorkspace
} from "../../../core/bubble/workspaceResolution.js";
import { readStateSnapshot, type LoadedStateSnapshot } from "../../../core/state/stateStore.js";
import { resolvePassHandoff, type ResolvedPassHandoff } from "../../domain/pass/handoff.js";
import type { AgentName, BubbleStateSnapshot } from "../../../types/bubble.js";

export interface PreparePassWorkspaceContextInput {
  cwd?: string | undefined;
  now: Date;
  nowIso: string;
  createError: PairflowCreateCommandError;
}

export interface PreparePassWorkspaceContextDependencies {
  resolveBubbleFromWorkspaceCwd?: typeof resolveBubbleFromWorkspaceCwd;
  ensureBubbleInstanceIdForMutation?: typeof ensureBubbleInstanceIdForMutation;
  readStateSnapshot?: typeof readStateSnapshot;
  resolveIdeationMetadata?: typeof resolveIdeationMetadata;
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
    dependencies.resolveIdeationMetadata ?? resolveIdeationMetadata;
  const resolveHandoff = dependencies.resolvePassHandoff ?? resolvePassHandoff;

  const resolved = await resolveBubble(input.cwd);
  const bubbleIdentity = await ensureBubbleIdentity({
    bubbleId: resolved.bubbleId,
    repoPath: resolved.repoPath,
    bubblePaths: resolved.bubblePaths,
    bubbleConfig: resolved.bubbleConfig,
    now: input.now
  });
  resolved.bubbleConfig = bubbleIdentity.bubbleConfig;

  const loadedState = await readState(resolved.bubblePaths.statePath);
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
