import { ensureBubbleInstanceIdForMutation } from "../../../core/bubble/bubbleInstanceId.js";
import { resolveBubbleFromWorkspaceCwd } from "../../../core/bubble/workspaceResolution.js";
import { readStateSnapshot } from "../../../core/state/stateStore.js";
import type {
  ResolvedAskHumanRoutingPreparationDependencies,
  ResolveAskHumanRoutingPreparationDependenciesInput
} from "./askHumanRoutingPreparationDependencyResolutionContract.js";

export function resolveAskHumanRoutingPreparationDependencies(
  input: ResolveAskHumanRoutingPreparationDependenciesInput
): ResolvedAskHumanRoutingPreparationDependencies {
  return {
    resolveBubble:
      input.resolveBubbleFromWorkspaceCwd ?? resolveBubbleFromWorkspaceCwd,
    ensureBubbleIdentity:
      input.ensureBubbleInstanceIdForMutation
      ?? ensureBubbleInstanceIdForMutation,
    readState: input.readStateSnapshot ?? readStateSnapshot
  };
}
