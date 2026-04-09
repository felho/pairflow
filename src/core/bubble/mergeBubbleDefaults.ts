import { resolveBubbleById } from "./bubbleLookup.js";
import { ensureBubbleInstanceIdForMutation } from "../../v11/infrastructure/artifact/bubble/bubbleInstanceId.js";
import { removeRuntimeSession } from "../../v11/infrastructure/executor/sessionRuntime/runtimeSessionsRegistry.js";
import { readStateSnapshot, writeStateSnapshot } from "../state/stateStore.js";
import { branchExists, runGit } from "../../v11/infrastructure/workspace/git.js";
import { cleanupWorktreeWorkspace } from "../../v11/infrastructure/workspace/worktreeManager.js";
import { terminateBubbleTmuxSession } from "../../v11/infrastructure/channel/tmux/tmuxManager.js";
import { emitBubbleLifecycleEventBestEffort } from "../../v11/shared/metrics/bubbleEvents.js";

export const mergeBubbleDependencyDefaults = {
  cleanupWorktreeWorkspace,
  emitBubbleLifecycleEventBestEffort,
  ensureBubbleInstanceIdForMutation,
  readStateSnapshot,
  removeRuntimeSession,
  resolveBubbleById,
  runGit,
  branchExists,
  terminateBubbleTmuxSession,
  writeStateSnapshot
} as const;
