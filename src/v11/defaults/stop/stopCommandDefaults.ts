import { resolveBubbleById } from "../../infrastructure/executor/workspace/bubbleLookup.js";
import { removeRuntimeSession } from "../runtimeSessions/runtimeSessionsDefaults.js";
import { readStateSnapshot, writeStateSnapshot } from "../state/stateStoreDefaults.js";
import { terminateBubbleTmuxSession } from "../../infrastructure/channel/tmux/tmuxManager.js";
import { executeStopCancellationMutation } from "./stopCancellationMutation.js";

export const stopBubbleDependencyDefaults = {
  executeStopCancellationMutation,
  readStateSnapshot,
  removeRuntimeSession,
  resolveBubbleById,
  terminateBubbleTmuxSession,
  writeStateSnapshot
} as const;
