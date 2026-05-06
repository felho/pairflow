import { ensureBubbleInstanceIdForMutation } from "../../shared/bubbleIdentity/bubbleIdentityDefaults.js";
import { resolveBubbleFromWorkspaceCwd } from "../workspace/workspaceResolutionDependencyDefaults.js";
import { readStateSnapshot } from "../state/stateStoreDependencyDefaults.js";

export const passWorkspaceContextDefaults = {
  ensureBubbleInstanceIdForMutation,
  readStateSnapshot,
  resolveBubbleFromWorkspaceCwd
} as const;
