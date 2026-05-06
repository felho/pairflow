import {
  readStateSnapshot
} from "../state/stateStoreDependencyDefaults.js";
import { ensureBubbleInstanceIdForMutation } from "../bubbleIdentity/bubbleIdentityDependencyDefaults.js";
import { resolveBubbleFromWorkspaceCwd } from "../workspace/workspaceResolutionDependencyDefaults.js";

export const askHumanRoutingPreparationDependencyDefaults = {
  resolveBubbleFromWorkspaceCwd,
  ensureBubbleInstanceIdForMutation,
  readStateSnapshot
} as const;
