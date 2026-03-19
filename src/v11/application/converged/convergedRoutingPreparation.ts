import { readStateSnapshot } from "../../../core/state/stateStore.js";
import {
  IDEATION_CONVERGED_BLOCKED,
  resolveIdeationMetadata
} from "../../../core/bubble/ideation.js";
import { resolveBubbleFromWorkspaceCwd } from "../../../core/bubble/workspaceResolution.js";
import { ensureBubbleInstanceIdForMutation } from "../../../core/bubble/bubbleInstanceId.js";
import type { AgentName, BubbleStateSnapshot } from "../../../types/bubble.js";

export interface PrepareConvergedRoutingInput {
  cwd?: string;
  now: Date;
  expectedStateFingerprint?: string;
  expectedRound?: number;
  expectedReviewer?: AgentName;
  createError: (message: string) => Error;
}

export interface PrepareConvergedRoutingDependencies {
  resolveBubbleFromWorkspaceCwd?: typeof resolveBubbleFromWorkspaceCwd;
  ensureBubbleInstanceIdForMutation?: typeof ensureBubbleInstanceIdForMutation;
  readStateSnapshot?: typeof readStateSnapshot;
  resolveIdeationMetadata?: typeof resolveIdeationMetadata;
}

export interface PrepareConvergedRoutingResult {
  resolved: Awaited<ReturnType<typeof resolveBubbleFromWorkspaceCwd>>;
  bubbleIdentity: Awaited<ReturnType<typeof ensureBubbleInstanceIdForMutation>>;
  state: BubbleStateSnapshot;
  implementer: AgentName;
  reviewer: AgentName;
}

function assertConvergedReviewerContext(
  state: BubbleStateSnapshot,
  configuredReviewer: AgentName,
  createError: (message: string) => Error
): void {
  if (state.state !== "RUNNING") {
    throw createError(
      `converged can only be used while bubble is RUNNING (current: ${state.state}).`
    );
  }

  if (state.round < 1) {
    throw createError(
      `RUNNING state must have round >= 1 (found ${state.round}).`
    );
  }

  if (state.active_agent === null || state.active_role === null || state.active_since === null) {
    throw createError(
      "RUNNING state is missing active agent context; cannot validate convergence."
    );
  }

  if (state.active_role !== "reviewer") {
    throw createError(
      `converged may only be invoked by the active reviewer (active role: ${state.active_role}).`
    );
  }

  if (state.active_agent !== configuredReviewer) {
    // reason_code=CONVERGED_REVIEWER_CONTEXT_MISMATCH round
    throw createError(
      `Active reviewer must be configured reviewer agent (${configuredReviewer}).`
    );
  }
}

export async function prepareConvergedRouting(
  input: PrepareConvergedRoutingInput,
  dependencies: PrepareConvergedRoutingDependencies = {}
): Promise<PrepareConvergedRoutingResult> {
  const resolveBubbleFromWorkspace =
    dependencies.resolveBubbleFromWorkspaceCwd ?? resolveBubbleFromWorkspaceCwd;
  const ensureBubbleIdentity =
    dependencies.ensureBubbleInstanceIdForMutation ?? ensureBubbleInstanceIdForMutation;
  const readStateSnapshotFn =
    dependencies.readStateSnapshot ?? readStateSnapshot;
  const resolveIdeationMetadataFn =
    dependencies.resolveIdeationMetadata ?? resolveIdeationMetadata;

  const resolved = await resolveBubbleFromWorkspace(input.cwd);
  const bubbleIdentity = await ensureBubbleIdentity({
    bubbleId: resolved.bubbleId,
    repoPath: resolved.repoPath,
    bubblePaths: resolved.bubblePaths,
    bubbleConfig: resolved.bubbleConfig,
    now: input.now
  });
  resolved.bubbleConfig = bubbleIdentity.bubbleConfig;

  const loadedState = await readStateSnapshotFn(resolved.bubblePaths.statePath);
  if (
    input.expectedStateFingerprint !== undefined
    && loadedState.fingerprint !== input.expectedStateFingerprint
  ) {
    // bubbleId context is emitted downstream by lifecycle metrics.
    throw input.createError(
      "Convergence validation failed: AUTO_CONVERGE_STATE_STALE: state changed before converged transition."
    );
  }

  const state = loadedState.state;
  const ideationMetadata = resolveIdeationMetadataFn(resolved.bubbleConfig);
  if (
    state.state === "RUNNING" &&
    state.round === 0 &&
    ideationMetadata.mode &&
    ideationMetadata.taskPending
  ) {
    throw input.createError(
      `${IDEATION_CONVERGED_BLOCKED}: ideation kickoff is required before CONVERGED handoff.`
    );
  }
  if (input.expectedRound !== undefined && state.round !== input.expectedRound) {
    throw input.createError(
      `Convergence validation failed: AUTO_CONVERGE_STATE_STALE: expected round ${input.expectedRound}, got ${state.round}.`
    );
  }
  if (
    input.expectedReviewer !== undefined
    && state.active_role === "reviewer"
    && state.active_agent !== input.expectedReviewer
  ) {
    // round and bubbleId context are emitted downstream by lifecycle metrics.
    throw input.createError(
      `Convergence validation failed: AUTO_CONVERGE_STATE_STALE: expected reviewer ${input.expectedReviewer}, got ${String(state.active_agent)}.`
    );
  }

  const { implementer, reviewer } = resolved.bubbleConfig.agents;
  assertConvergedReviewerContext(state, reviewer, input.createError);

  return {
    resolved,
    bubbleIdentity,
    state,
    implementer,
    reviewer
  };
}
