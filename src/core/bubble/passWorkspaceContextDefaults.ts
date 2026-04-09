import { ensureBubbleInstanceIdForMutation } from "../../v11/infrastructure/artifact/bubble/bubbleInstanceId.js";
import { resolveBubbleFromWorkspaceCwd } from "../../v11/infrastructure/executor/workspace/workspaceResolution.js";
import { readStateSnapshot } from "../state/stateStore.js";

export type {
  EnsureBubbleInstanceIdForMutationResult
} from "../../v11/infrastructure/artifact/bubble/bubbleInstanceId.js";
export type {
  ResolvedBubbleWorkspace
} from "../../v11/infrastructure/executor/workspace/workspaceResolution.js";
export type {
  LoadedStateSnapshot
} from "../state/stateStore.js";

export const passWorkspaceContextDefaults = {
  ensureBubbleInstanceIdForMutation,
  readStateSnapshot,
  resolveBubbleFromWorkspaceCwd
} as const;
