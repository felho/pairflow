import type { ensureBubbleInstanceIdForMutation } from "../../../core/bubble/bubbleInstanceId.js";
import type { resolveBubbleFromWorkspaceCwd } from "../../../core/bubble/workspaceResolution.js";
import type { readStateSnapshot } from "../../infrastructure/state/stateStore.js";

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
