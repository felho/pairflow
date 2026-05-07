import {
  ensureBubbleInstanceIdForMutation,
  readStateSnapshot,
  resolveBubbleFromWorkspaceCwd
} from "../start/startCommandDependencyDefaults.js";

export const askHumanRoutingPreparationDependencyDefaults = {
  resolveBubbleFromWorkspaceCwd,
  ensureBubbleInstanceIdForMutation,
  readStateSnapshot
} as const;
