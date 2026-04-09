import { resolveBubbleById } from "./bubbleLookup.js";
import { resolveBubbleFromWorkspaceCwd } from "../../v11/infrastructure/executor/workspace/workspaceResolution.js";
import { readStateSnapshot } from "../state/stateStore.js";

export const actorEmitContextDefaults = {
  readStateSnapshot,
  resolveBubbleById,
  resolveBubbleFromWorkspaceCwd
} as const;
