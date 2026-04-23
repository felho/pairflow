import { convergedDependencyDefaults } from "./convergedDependencyDefaults.js";
import {
  IDEATION_CONVERGED_BLOCKED
} from "../../shared/ideation/ideationReasonCodes.js";
import {
  resolveIdeationMetadata
} from "../../domain/ideation/ideationMetadata.js";
import type { ActorEmitContextSnapshot } from "../../shared/actorProtocol/actorEmitContext.js";
import type {
  AgentName,
  BubbleReviewLoopMode,
  BubbleStateSnapshot
} from "../../../types/bubble.js";
import {
  resolveRuntimeAlignedConvergedActiveRole,
  toRuntimeAlignedReviewPolicyExecutionContext
} from "../../shared/reviewPolicy/reviewPolicyRuntime.js";

export interface PrepareConvergedRoutingInput {
  cwd?: string;
  now: Date;
  authoritativeContext?: ActorEmitContextSnapshot;
  expectedStateFingerprint?: string;
  expectedRound?: number;
  expectedReviewer?: AgentName;
  createError: PairflowCreateCommandError;
}

export interface PrepareConvergedRoutingDependencies {
  resolveBubbleFromWorkspaceCwd?: typeof convergedDependencyDefaults.routing.resolveBubbleFromWorkspaceCwd;
  ensureBubbleInstanceIdForMutation?: typeof convergedDependencyDefaults.routing.ensureBubbleInstanceIdForMutation;
  readStateSnapshot?: typeof convergedDependencyDefaults.routing.readStateSnapshot;
  resolveIdeationMetadata?: typeof resolveIdeationMetadata;
}

export interface PrepareConvergedRoutingResult {
  resolved: Awaited<ReturnType<typeof convergedDependencyDefaults.routing.resolveBubbleFromWorkspaceCwd>>;
  bubbleIdentity: Awaited<ReturnType<typeof convergedDependencyDefaults.routing.ensureBubbleInstanceIdForMutation>>;
  state: BubbleStateSnapshot;
  implementer: AgentName;
  reviewer: AgentName;
  effectiveLoopMode: BubbleReviewLoopMode;
}

function assertConvergedActiveContext(input: {
  state: BubbleStateSnapshot,
  configuredImplementer: AgentName,
  configuredReviewer: AgentName,
  effectiveLoopMode: BubbleReviewLoopMode,
  createError: PairflowCreateCommandError
}): void {
  const {
    state,
    configuredImplementer,
    configuredReviewer,
    effectiveLoopMode,
    createError
  } = input;
  if (state.state !== "RUNNING") {
    throw createError({
      reasonCode: "CONVERGED_STATE_NOT_RUNNING",
      message: `converged can only be used while bubble is RUNNING (current: ${state.state}).`,
      context: {
        command_name: "converged",
        current_state: state.state
      }
    });
  }

  if (state.round < 1) {
    throw createError({
      reasonCode: "CONVERGED_RUNNING_ROUND_INVALID",
      message: `RUNNING state must have round >= 1 (found ${state.round}).`,
      context: {
        command_name: "converged",
        round: state.round
      }
    });
  }

  if (state.active_agent === null || state.active_role === null || state.active_since === null) {
    throw createError({
      reasonCode: "CONVERGED_ACTIVE_CONTEXT_MISSING",
      message: "RUNNING state is missing active agent context; cannot validate convergence.",
      context: {
        command_name: "converged"
      }
    });
  }

  const expectedRole =
    effectiveLoopMode === "meta_only" ? "implementer" : "reviewer";
  if (state.active_role !== expectedRole) {
    throw createError({
      reasonCode: "CONVERGED_ACTIVE_ROLE_UNSUPPORTED",
      message:
        expectedRole === "implementer"
          ? `converged may only be invoked by the active implementer while reviewer-bypass runtime activation is live (active role: ${state.active_role}).`
          : `converged may only be invoked by the active reviewer (active role: ${state.active_role}).`,
      context: {
        command_name: "converged",
        active_role: state.active_role,
        expected_active_role: expectedRole,
        effective_loop_mode: effectiveLoopMode
      }
    });
  }

  const expectedAgent =
    expectedRole === "implementer"
      ? configuredImplementer
      : configuredReviewer;
  if (state.active_agent !== expectedAgent) {
    throw createError({
      reasonCode:
        expectedRole === "implementer"
          ? "CONVERGED_IMPLEMENTER_CONTEXT_MISMATCH"
          : "CONVERGED_REVIEWER_CONTEXT_MISMATCH",
      message:
        expectedRole === "implementer"
          ? `Active implementer must be configured implementer agent (${configuredImplementer}).`
          : `Active reviewer must be configured reviewer agent (${configuredReviewer}).`,
      context: {
        command_name: "converged",
        round: state.round,
        active_agent: state.active_agent,
        configured_agent: expectedAgent,
        expected_active_role: expectedRole,
        effective_loop_mode: effectiveLoopMode
      }
    });
  }
}

export async function prepareConvergedRouting(
  input: PrepareConvergedRoutingInput,
  dependencies: PrepareConvergedRoutingDependencies = {}
): Promise<PrepareConvergedRoutingResult> {
  const resolveBubbleFromWorkspace =
    dependencies.resolveBubbleFromWorkspaceCwd
    ?? convergedDependencyDefaults.routing.resolveBubbleFromWorkspaceCwd;
  const ensureBubbleIdentity =
    dependencies.ensureBubbleInstanceIdForMutation
    ?? convergedDependencyDefaults.routing.ensureBubbleInstanceIdForMutation;
  const readStateSnapshotFn =
    dependencies.readStateSnapshot
    ?? convergedDependencyDefaults.routing.readStateSnapshot;
  const resolveIdeationMetadataFn =
    dependencies.resolveIdeationMetadata ?? resolveIdeationMetadata;

  const authoritativeResolved =
    input.authoritativeContext === undefined
      ? undefined
      : {
          bubbleId: input.authoritativeContext.bubble_id,
          repoPath: input.authoritativeContext.repo,
          bubblePaths: input.authoritativeContext.resolved.bubblePaths,
          bubbleConfig: input.authoritativeContext.resolved.bubbleConfig,
          worktreePath: input.authoritativeContext.worktree_path,
          cwd: input.authoritativeContext.worktree_path
        };
  const resolved =
    authoritativeResolved
    ?? await resolveBubbleFromWorkspace(input.cwd);
  const bubbleIdentity = await ensureBubbleIdentity({
    bubbleId: resolved.bubbleId,
    repoPath: resolved.repoPath,
    bubblePaths: resolved.bubblePaths,
    bubbleConfig: resolved.bubbleConfig,
    now: input.now
  });
  resolved.bubbleConfig = bubbleIdentity.bubbleConfig;

  // Even when the caller provides authoritative actor context, convergence must
  // independently re-read the persisted state before applying stale guards.
  const loadedState = await readStateSnapshotFn(resolved.bubblePaths.statePath);
  if (
    input.expectedStateFingerprint !== undefined
    && loadedState.fingerprint !== input.expectedStateFingerprint
  ) {
    throw input.createError({
      reasonCode: "AUTO_CONVERGE_STATE_STALE",
      message: "Convergence validation failed: state changed before converged transition.",
      context: {
        command_name: "converged",
        expected_state_fingerprint: input.expectedStateFingerprint,
        actual_state_fingerprint: loadedState.fingerprint
      }
    });
  }

  const state = loadedState.state;
  const ideationMetadata = resolveIdeationMetadataFn(resolved.bubbleConfig);
  if (
    state.state === "RUNNING" &&
    state.round === 0 &&
    ideationMetadata.mode &&
    ideationMetadata.taskPending
  ) {
    throw input.createError({
      reasonCode: IDEATION_CONVERGED_BLOCKED,
      message: "ideation kickoff is required before CONVERGED handoff.",
      context: {
        command_name: "converged",
        round: state.round
      }
    });
  }
  if (input.expectedRound !== undefined && state.round !== input.expectedRound) {
    throw input.createError({
      reasonCode: "AUTO_CONVERGE_STATE_STALE",
      message: `Convergence validation failed: expected round ${input.expectedRound}, got ${state.round}.`,
      context: {
        command_name: "converged",
        expected_round: input.expectedRound,
        current_round: state.round
      }
    });
  }
  if (
    input.expectedReviewer !== undefined
    && state.active_role === "reviewer"
    && state.active_agent !== input.expectedReviewer
  ) {
    throw input.createError({
      reasonCode: "AUTO_CONVERGE_STATE_STALE",
      message: `Convergence validation failed: expected reviewer ${input.expectedReviewer}, got ${String(state.active_agent)}.`,
      context: {
        command_name: "converged",
        expected_reviewer: input.expectedReviewer,
        active_reviewer: String(state.active_agent)
      }
    });
  }

  const { implementer, reviewer } = resolved.bubbleConfig.agents;
  const effectiveLoopMode = resolveRuntimeAlignedConvergedActiveRole({
    config: resolved.bubbleConfig,
    round: state.round,
    activeRole: state.active_role,
    executionContext: toRuntimeAlignedReviewPolicyExecutionContext(
      state.execution_context
    )
  }) === "implementer"
    ? "meta_only"
    : "full";
  assertConvergedActiveContext({
    state,
    configuredImplementer: implementer,
    configuredReviewer: reviewer,
    effectiveLoopMode,
    createError: input.createError
  });

  return {
    resolved,
    bubbleIdentity,
    state,
    implementer,
    reviewer,
    effectiveLoopMode
  };
}
