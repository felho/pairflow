import {
  normalizeStringList,
  requireNonEmptyString
} from "../../shared/normalization/stringNormalization.js";
import { resolveAskHumanRoutingPreparationDependencies } from "../../shared/askHuman/askHumanRoutingPreparationDependencyResolution.js";
import { assertAskHumanRunningState } from "../../shared/askHuman/askHumanRunningStateValidation.js";
import { prepareAskHumanWorkspaceContext } from "../../shared/askHuman/askHumanWorkspaceContextPreparation.js";
import type {
  PrepareAskHumanRoutingDependencies,
  PrepareAskHumanRoutingInput,
  PrepareAskHumanRoutingResult
} from "../../shared/askHuman/askHumanRoutingContract.js";

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
    authoritativeContext: input.authoritativeContext,
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
