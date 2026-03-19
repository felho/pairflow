import { ensureBubbleInstanceIdForMutation } from "../../../core/bubble/bubbleInstanceId.js";
import { resolveBubbleFromWorkspaceCwd } from "../../../core/bubble/workspaceResolution.js";
import { readStateSnapshot } from "../../../core/state/stateStore.js";

export interface ResolveAskHumanRoutingPreparationDependenciesInput {
  resolveBubbleFromWorkspaceCwd?: typeof resolveBubbleFromWorkspaceCwd | undefined;
  ensureBubbleInstanceIdForMutation?:
    | typeof ensureBubbleInstanceIdForMutation
    | undefined;
  readStateSnapshot?: typeof readStateSnapshot | undefined;
}

export interface ResolvedAskHumanRoutingPreparationDependencies {
  resolveBubble: typeof resolveBubbleFromWorkspaceCwd;
  ensureBubbleIdentity: typeof ensureBubbleInstanceIdForMutation;
  readState: typeof readStateSnapshot;
}

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
