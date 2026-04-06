import { ensureBubbleInstanceIdForMutation } from "../../infrastructure/artifact/bubble/bubbleInstanceId.js";
import { resolveBubbleFromWorkspaceCwd } from "../../infrastructure/executor/workspace/workspaceResolution.js";
import { readStateSnapshot } from "../../infrastructure/state/stateStore.js";

export const askHumanRoutingPreparationDependencyDefaults = {
  resolveBubbleFromWorkspaceCwd,
  ensureBubbleInstanceIdForMutation,
  readStateSnapshot
} as const;
