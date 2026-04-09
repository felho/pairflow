import { resolveBubbleById } from "./bubbleLookup.js";
import { removeRuntimeSession } from "../../v11/infrastructure/executor/sessionRuntime/runtimeSessionsRegistry.js";
import { terminateBubbleTmuxSession } from "../../v11/infrastructure/channel/tmux/tmuxManager.js";
import { readStateSnapshot, writeStateSnapshot } from "../state/stateStore.js";

export const stopBubbleDependencyDefaults = {
  readStateSnapshot,
  removeRuntimeSession,
  resolveBubbleById,
  terminateBubbleTmuxSession,
  writeStateSnapshot
} as const;
