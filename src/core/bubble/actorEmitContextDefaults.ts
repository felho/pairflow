import { resolveBubbleById } from "./bubbleLookup.js";
import { resolveBubbleFromWorkspaceCwd } from "./workspaceResolution.js";
import { readStateSnapshot } from "../state/stateStore.js";

export const actorEmitContextDefaults = {
  readStateSnapshot,
  resolveBubbleById,
  resolveBubbleFromWorkspaceCwd
} as const;
