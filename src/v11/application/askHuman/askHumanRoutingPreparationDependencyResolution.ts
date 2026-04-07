import type {
  ResolvedAskHumanRoutingPreparationDependencies,
  ResolveAskHumanRoutingPreparationDependenciesInput
} from "../../shared/askHuman/askHumanRoutingPreparationDependencyResolutionContract.js";
import { askHumanRoutingPreparationDependencyDefaults } from "./askHumanRoutingPreparationDependencyDefaults.js";

export function resolveAskHumanRoutingPreparationDependencies(
  input: ResolveAskHumanRoutingPreparationDependenciesInput
): ResolvedAskHumanRoutingPreparationDependencies {
  return {
    resolveBubble:
      input.resolveBubbleFromWorkspaceCwd
      ?? askHumanRoutingPreparationDependencyDefaults.resolveBubbleFromWorkspaceCwd,
    ensureBubbleIdentity:
      input.ensureBubbleInstanceIdForMutation
      ?? askHumanRoutingPreparationDependencyDefaults.ensureBubbleInstanceIdForMutation,
    readState:
      input.readStateSnapshot
      ?? askHumanRoutingPreparationDependencyDefaults.readStateSnapshot
  };
}
