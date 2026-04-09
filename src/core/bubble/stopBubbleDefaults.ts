import { resolveBubbleById } from "./bubbleLookup.js";
import { removeRuntimeSession } from "../runtime/sessionsRegistry.js";
import { terminateBubbleTmuxSession } from "../runtime/tmuxManager.js";
import { readStateSnapshot, writeStateSnapshot } from "../state/stateStore.js";

export const stopBubbleDependencyDefaults = {
  readStateSnapshot,
  removeRuntimeSession,
  resolveBubbleById,
  terminateBubbleTmuxSession,
  writeStateSnapshot
} as const;
