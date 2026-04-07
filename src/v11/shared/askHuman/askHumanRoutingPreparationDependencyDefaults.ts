import { ensureBubbleInstanceIdForMutation } from "../../../core/bubble/bubbleInstanceId.js";
import { resolveBubbleFromWorkspaceCwd } from "../../../core/bubble/workspaceResolution.js";
import { readStateSnapshot } from "../../../core/state/stateStore.js";

export const askHumanRoutingPreparationDependencyDefaults = {
  resolveBubbleFromWorkspaceCwd,
  ensureBubbleInstanceIdForMutation,
  readStateSnapshot
} as const;
