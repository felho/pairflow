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
import { resolveAskHumanRoutingPreparationDependencies } from "../../shared/askHuman/askHumanRoutingPreparationDependencyResolution.js";
import { assertAskHumanRunningState } from "../../shared/askHuman/askHumanRunningStateValidation.js";
import type { AskHumanRoutingContext } from "../../shared/askHuman/askHumanRoutingContext.js";

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
