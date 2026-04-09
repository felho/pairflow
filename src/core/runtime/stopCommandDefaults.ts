import { resolveBubbleById } from "../bubble/bubbleLookup.js";
import { removeRuntimeSession } from "./sessionsRegistry.js";
import { terminateBubbleTmuxSession } from "./tmuxManager.js";
import { readStateSnapshot, writeStateSnapshot } from "../state/stateStore.js";

export const stopCommandDefaults = {
  readStateSnapshot,
  removeRuntimeSession,
  resolveBubbleById,
  terminateBubbleTmuxSession,
  writeStateSnapshot
} as const;
