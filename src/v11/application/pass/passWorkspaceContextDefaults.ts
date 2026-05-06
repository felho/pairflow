import { ensureBubbleInstanceIdForMutation } from "../../shared/bubbleIdentity/bubbleIdentityDefaults.js";
import { resolveBubbleFromWorkspaceCwd } from "../workspace/workspaceResolutionDependencyDefaults.js";
import { readStateSnapshot } from "../../shared/state/stateStoreDefaults.js";

export const passWorkspaceContextDefaults = {
  ensureBubbleInstanceIdForMutation,
  readStateSnapshot,
  resolveBubbleFromWorkspaceCwd
} as const;
