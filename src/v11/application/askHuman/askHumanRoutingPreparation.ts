import {
  ensureBubbleInstanceIdForMutation
} from "../../../core/bubble/bubbleInstanceId.js";
import {
  resolveBubbleFromWorkspaceCwd
} from "../../../core/bubble/workspaceResolution.js";
import {
  readStateSnapshot
} from "../../../core/state/stateStore.js";
import {
  normalizeStringList,
  requireNonEmptyString
} from "../../../core/util/normalize.js";
import type { BubbleStateSnapshot } from "../../../types/bubble.js";
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

function assertAskHumanRunningState(
  state: BubbleStateSnapshot,
  createError: (message: string) => Error
): asserts state is AskHumanRunningState {
  if (state.state !== "RUNNING") {
    throw createError(
      `ask-human can only be used while bubble is RUNNING (current: ${state.state}).`
    );
  }

  if (state.round < 1) {
    throw createError(
      `RUNNING state must have round >= 1 (found ${state.round}).`
    );
  }

  if (
    state.active_agent === null
    || state.active_role === null
    || state.active_since === null
  ) {
    throw createError(
      "RUNNING state is missing active agent context; cannot emit HUMAN_QUESTION."
    );
  }

  if (state.active_role === "meta_reviewer") {
    throw createError(
      "ask-human cannot be used from meta_reviewer role while bubble is RUNNING."
    );
  }
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

  const resolveBubble = dependencies.resolveBubbleFromWorkspaceCwd
    ?? resolveBubbleFromWorkspaceCwd;
  const ensureBubbleIdentity = dependencies.ensureBubbleInstanceIdForMutation
    ?? ensureBubbleInstanceIdForMutation;
  const readState = dependencies.readStateSnapshot
    ?? readStateSnapshot;

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
