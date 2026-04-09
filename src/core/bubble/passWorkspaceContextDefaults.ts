import { ensureBubbleInstanceIdForMutation } from "./bubbleInstanceId.js";
import { resolveBubbleFromWorkspaceCwd } from "./workspaceResolution.js";
import { readStateSnapshot } from "../state/stateStore.js";

export const passWorkspaceContextDefaults = {
  ensureBubbleInstanceIdForMutation,
  readStateSnapshot,
  resolveBubbleFromWorkspaceCwd
} as const;
