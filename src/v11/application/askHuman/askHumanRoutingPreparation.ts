import type {
  ensureBubbleInstanceIdForMutation
} from "../../../core/bubble/bubbleInstanceId.js";
import type {
  resolveBubbleFromWorkspaceCwd
} from "../../../core/bubble/workspaceResolution.js";
import type {
  readStateSnapshot
} from "../../../core/state/stateStore.js";
import {
  normalizeStringList,
  requireNonEmptyString
} from "../../../core/util/normalize.js";
import type { BubbleStateSnapshot } from "../../../types/bubble.js";
import { resolveAskHumanRoutingPreparationDependencies } from "../../shared/askHuman/askHumanRoutingPreparationDependencyResolution.js";
import type {
  AskHumanRoutingContext,
  AskHumanRunningState
} from "../../shared/askHuman/askHumanRoutingContext.js";

export interface PrepareAskHumanRoutingInput {
  question: string;
  refs?: string[];
  cwd?: string;
  now: Date;
  createError: (message: string) => Error;
}

export type PrepareAskHumanRoutingResult = AskHumanRoutingContext;

export interface PrepareAskHumanRoutingDependencies {
  resolveBubbleFromWorkspaceCwd?: typeof resolveBubbleFromWorkspaceCwd;
  ensureBubbleInstanceIdForMutation?: typeof ensureBubbleInstanceIdForMutation;
  readStateSnapshot?: typeof readStateSnapshot;
}

function assertRunningLifecycleState(
  state: BubbleStateSnapshot,
  createError: (message: string) => Error
): void {
  if (state.state !== "RUNNING") {
    // reason_code=ASK_HUMAN_STATE_NOT_RUNNING context=routing_precondition
    throw createError(
      `ask-human can only be used while bubble is RUNNING (current: ${state.state}).`
    );
  }
}

function assertRunningRound(
  state: BubbleStateSnapshot,
  createError: (message: string) => Error
): void {
  if (state.round < 1) {
    // reason_code=ASK_HUMAN_RUNNING_ROUND_INVALID context=routing_precondition
    throw createError(
      `RUNNING state must have round >= 1 (found ${state.round}).`
    );
  }
}

function assertRunningActiveContext(
  state: BubbleStateSnapshot,
  createError: (message: string) => Error
): void {
  if (
    state.active_agent === null
    || state.active_role === null
    || state.active_since === null
  ) {
    // reason_code=ASK_HUMAN_ACTIVE_CONTEXT_MISSING context=routing_precondition
    throw createError(
      "RUNNING state is missing active agent context; cannot emit HUMAN_QUESTION."
    );
  }
}

function assertRunningRoleAllowed(
  state: BubbleStateSnapshot,
  createError: (message: string) => Error
): void {
  if (state.active_role === "meta_reviewer") {
    // reason_code=ASK_HUMAN_ROLE_UNSUPPORTED context=routing_precondition
    throw createError(
      "ask-human cannot be used from meta_reviewer role while bubble is RUNNING."
    );
  }
}

function assertAskHumanRunningState(
  state: BubbleStateSnapshot,
  createError: (message: string) => Error
): asserts state is AskHumanRunningState {
  assertRunningLifecycleState(state, createError);
  assertRunningRound(state, createError);
  assertRunningActiveContext(state, createError);
  assertRunningRoleAllowed(state, createError);
}

export async function prepareAskHumanRouting(
  input: PrepareAskHumanRoutingInput,
  dependencies: PrepareAskHumanRoutingDependencies = {}
): Promise<PrepareAskHumanRoutingResult> {
  const question = requireNonEmptyString(
    input.question,
    "Question",
    input.createError
  );
  const refs = normalizeStringList(input.refs ?? []);

  const resolvedDependencies = resolveAskHumanRoutingPreparationDependencies({
    resolveBubbleFromWorkspaceCwd: dependencies.resolveBubbleFromWorkspaceCwd,
    ensureBubbleInstanceIdForMutation:
      dependencies.ensureBubbleInstanceIdForMutation,
    readStateSnapshot: dependencies.readStateSnapshot
  });

  const resolved = await resolvedDependencies.resolveBubble(input.cwd);
  const bubbleIdentity = await resolvedDependencies.ensureBubbleIdentity({
    bubbleId: resolved.bubbleId,
    repoPath: resolved.repoPath,
    bubblePaths: resolved.bubblePaths,
    bubbleConfig: resolved.bubbleConfig,
    now: input.now
  });
  resolved.bubbleConfig = bubbleIdentity.bubbleConfig;

  const loadedState = await resolvedDependencies.readState(
    resolved.bubblePaths.statePath
  );
  const state = loadedState.state;
  assertAskHumanRunningState(state, input.createError);

  return {
    nowIso: input.now.toISOString(),
    question,
    refs,
    resolved,
    bubbleIdentity,
    loadedState,
    state
  };
}
