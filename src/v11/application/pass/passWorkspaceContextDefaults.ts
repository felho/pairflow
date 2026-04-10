import { ensureBubbleInstanceIdForMutation } from "../../defaults/bubbleIdentity/bubbleIdentityDefaults.js";
import { resolveBubbleFromWorkspaceCwd } from "../../defaults/workspace/workspaceResolutionDefaults.js";
import { readStateSnapshot } from "../../shared/state/stateStoreDefaults.js";

export const passWorkspaceContextDefaults = {
  ensureBubbleInstanceIdForMutation,
  readStateSnapshot,
  resolveBubbleFromWorkspaceCwd
} as const;
