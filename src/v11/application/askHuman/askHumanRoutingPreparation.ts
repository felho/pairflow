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
import { prepareAskHumanWorkspaceContext } from "../../shared/askHuman/askHumanWorkspaceContextPreparation.js";
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

  const workspace = await prepareAskHumanWorkspaceContext({
    cwd: input.cwd,
    now: input.now,
    dependencies: resolvedDependencies
  });
  assertAskHumanRunningState(workspace.state, input.createError);

  return {
    nowIso: input.now.toISOString(),
    question,
    refs,
    resolved: workspace.resolved,
    bubbleIdentity: workspace.bubbleIdentity,
    loadedState: workspace.loadedState,
    state: workspace.state
  };
}
