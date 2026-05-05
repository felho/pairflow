import { resolveBubbleById } from "../bubbleLookup/bubbleLookupDefaults.js";
import { removeRuntimeSession } from "../runtimeSessions/runtimeSessionsDefaults.js";
import { readStateSnapshot, writeStateSnapshot } from "../state/stateStoreDefaults.js";
import { terminateBubbleTmuxSession } from "../tmux/tmuxSessionDefaults.js";
import { executeStopCancellationMutation } from "./stopCancellationMutation.js";

export const stopBubbleDependencyDefaults = {
  executeStopCancellationMutation,
  readStateSnapshot,
  removeRuntimeSession,
  resolveBubbleById,
  terminateBubbleTmuxSession,
  writeStateSnapshot
} as const;
