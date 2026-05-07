import {
  readStateSnapshot
} from "../state/stateStoreDependencyDefaults.js";
import {
  ensureBubbleInstanceIdForMutation,
  resolveBubbleFromWorkspaceCwd
} from "../start/startCommandDependencyDefaults.js";

export const askHumanRoutingPreparationDependencyDefaults = {
  resolveBubbleFromWorkspaceCwd,
  ensureBubbleInstanceIdForMutation,
  readStateSnapshot
} as const;
