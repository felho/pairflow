import type {
  ResolvedAskHumanRoutingPreparationDependencies,
  ResolveAskHumanRoutingPreparationDependenciesInput
} from "./askHumanRoutingPreparationDependencyResolutionContract.js";
import {
  ensureBubbleInstanceIdForMutation,
  readStateSnapshot,
  resolveBubbleFromWorkspaceCwd
} from "../start/startCommandDependencyDefaults.js";

export function resolveAskHumanRoutingPreparationDependencies(
  input: ResolveAskHumanRoutingPreparationDependenciesInput
): ResolvedAskHumanRoutingPreparationDependencies {
  return {
    resolveBubble:
      input.resolveBubbleFromWorkspaceCwd
      ?? resolveBubbleFromWorkspaceCwd,
    ensureBubbleIdentity:
      input.ensureBubbleInstanceIdForMutation
      ?? ensureBubbleInstanceIdForMutation,
    readState:
      input.readStateSnapshot
      ?? readStateSnapshot
  };
}
