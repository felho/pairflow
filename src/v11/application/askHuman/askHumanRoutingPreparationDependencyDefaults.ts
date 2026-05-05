import {
  readStateSnapshot
} from "../../shared/state/stateStoreDefaults.js";
import { ensureBubbleInstanceIdForMutation } from "../../shared/bubbleIdentity/bubbleIdentityDefaults.js";
import { resolveBubbleFromWorkspaceCwd } from "../../shared/workspace/workspaceResolutionDefaults.js";

export const askHumanRoutingPreparationDependencyDefaults = {
  resolveBubbleFromWorkspaceCwd,
  ensureBubbleInstanceIdForMutation,
  readStateSnapshot
} as const;
