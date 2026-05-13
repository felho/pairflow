import { resolveBubbleById } from "../../infrastructure/executor/workspace/bubbleLookup.js";
import { removeRuntimeSession } from "../runtimeSessions/runtimeSessionsDefaults.js";
import {
  readStateSnapshot,
  writeStateSnapshot
} from "../../infrastructure/state/stateStore.js";
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
