import {
  ensureBubbleInstanceIdForMutation,
  readStateSnapshot,
  resolveBubbleFromWorkspaceCwd
} from "../start/startCommandDependencyDefaults.js";

export const passWorkspaceContextDefaults = {
  ensureBubbleInstanceIdForMutation,
  readStateSnapshot,
  resolveBubbleFromWorkspaceCwd
} as const;
