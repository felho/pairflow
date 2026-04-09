import { resolveBubbleById } from "../../infrastructure/executor/workspace/bubbleLookup.js";
import { removeRuntimeSession } from "../../infrastructure/executor/sessionRuntime/runtimeSessionsRegistry.js";
import { terminateBubbleTmuxSession } from "../../infrastructure/channel/tmux/tmuxManager.js";
import { readStateSnapshot, writeStateSnapshot } from "../../infrastructure/state/stateStore.js";

export const stopCommandDefaults = {
  readStateSnapshot,
  removeRuntimeSession,
  resolveBubbleById,
  terminateBubbleTmuxSession,
  writeStateSnapshot
} as const;
