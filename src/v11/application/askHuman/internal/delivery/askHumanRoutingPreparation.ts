import {
  normalizeStringList,
  requireNonEmptyString
} from "../../../../shared/normalization/stringNormalization.js";
import { assertAskHumanRunningState } from "../mutation/askHumanRunningStateValidation.js";
import type {
  PrepareAskHumanRoutingDependencies,
  PrepareAskHumanRoutingInput,
  PrepareAskHumanRoutingResult
} from "./askHumanRoutingContract.js";
import {
  buildOptionalActorActivationProvenance
} from "../../../../shared/actorProtocol/actorEmitContext.js";
import { prepareAskHumanWorkspaceContext } from "./askHumanWorkspaceContextPreparation.js";
import {
  ensureBubbleInstanceIdForMutation,
  readStateSnapshot,
  resolveBubbleFromWorkspaceCwd
} from "../../../start/startCommandDependencyDefaults.js";
import { adaptPersistedReadPortToDomain } from "../../../../shared/mutation/mutationBoundaryIO.js";

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

  const workspace = await prepareAskHumanWorkspaceContext({
    cwd: input.cwd,
    authoritativeContext: input.authoritativeContext,
    now: input.now,
    dependencies: {
      resolveBubble:
        dependencies.resolveBubbleFromWorkspaceCwd
        ?? resolveBubbleFromWorkspaceCwd,
      ensureBubbleIdentity:
        dependencies.ensureBubbleInstanceIdForMutation
        ?? ensureBubbleInstanceIdForMutation,
      readState:
        dependencies.readStateSnapshot
        ?? adaptPersistedReadPortToDomain(readStateSnapshot)
    }
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
