import {
  ensureBubbleInstanceIdForMutation,
  type EnsureBubbleInstanceIdForMutationResult
} from "../../../core/bubble/bubbleInstanceId.js";
import {
  resolveBubbleFromWorkspaceCwd,
  type ResolvedBubbleWorkspace
} from "../../../core/bubble/workspaceResolution.js";
import {
  readStateSnapshot,
  type LoadedStateSnapshot
} from "../../../core/state/stateStore.js";
import {
  normalizeStringList,
  requireNonEmptyString
} from "../../../core/util/normalize.js";
import type { AgentName, AgentRole, BubbleStateSnapshot } from "../../../types/bubble.js";

export interface PrepareAskHumanRoutingInput {
  question: string;
  refs?: string[];
  cwd?: string;
  now: Date;
  createError: (message: string) => Error;
}

export interface PrepareAskHumanRoutingResult {
  nowIso: string;
  question: string;
  refs: string[];
  resolved: ResolvedBubbleWorkspace;
  bubbleIdentity: EnsureBubbleInstanceIdForMutationResult;
  loadedState: LoadedStateSnapshot;
  state: AskHumanRunningState;
}

export interface PrepareAskHumanRoutingDependencies {
  resolveBubbleFromWorkspaceCwd?: typeof resolveBubbleFromWorkspaceCwd;
  ensureBubbleInstanceIdForMutation?: typeof ensureBubbleInstanceIdForMutation;
  readStateSnapshot?: typeof readStateSnapshot;
}

type AskHumanActiveRole = Exclude<AgentRole, "meta_reviewer">;

export interface AskHumanRunningState extends BubbleStateSnapshot {
  state: "RUNNING";
  active_agent: AgentName;
  active_role: AskHumanActiveRole;
  active_since: string;
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
