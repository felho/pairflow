import { ensureBubbleInstanceIdForMutation } from "../../../core/bubble/bubbleInstanceId.js";
import { resolveBubbleFromWorkspaceCwd } from "../../../core/bubble/workspaceResolution.js";
import { readStateSnapshot } from "../../infrastructure/state/stateStore.js";

export const askHumanRoutingPreparationDependencyDefaults = {
  resolveBubbleFromWorkspaceCwd,
  ensureBubbleInstanceIdForMutation,
  readStateSnapshot
} as const;
