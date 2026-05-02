import {
  normalizeStringList,
  requireNonEmptyString
} from "../../shared/normalization/stringNormalization.js";
import { assertAskHumanRunningState } from "./askHumanRunningStateValidation.js";
import type {
  PrepareAskHumanRoutingDependencies,
  PrepareAskHumanRoutingInput,
  PrepareAskHumanRoutingResult
} from "./askHumanRoutingContract.js";
import {
  buildOptionalActorActivationProvenance
} from "../../shared/actorProtocol/actorEmitContext.js";
import { resolveAskHumanRoutingPreparationDependencies } from "./askHumanRoutingPreparationDependencyResolution.js";
import { prepareAskHumanWorkspaceContext } from "./askHumanWorkspaceContextPreparation.js";

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
  const activation =
    workspace.state.active_role === "implementer"
      ? buildOptionalActorActivationProvenance({
          ...(input.authoritativeContext !== undefined
            ? { authoritativeContext: input.authoritativeContext }
            : {}),
          loadedState: workspace.loadedState
        })
      : undefined;

  return {
    nowIso: input.now.toISOString(),
    question,
    refs,
    resolved: workspace.resolved,
    bubbleIdentity: workspace.bubbleIdentity,
    loadedState: workspace.loadedState,
    state: workspace.state,
    ...(activation !== undefined ? { activation } : {})
  };
}
