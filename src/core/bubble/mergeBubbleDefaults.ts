import { resolveBubbleById } from "./bubbleLookup.js";
import { ensureBubbleInstanceIdForMutation } from "./bubbleInstanceId.js";
import { readStateSnapshot, writeStateSnapshot } from "../state/stateStore.js";
import { branchExists, runGit } from "../workspace/git.js";
import { cleanupWorktreeWorkspace } from "../workspace/worktreeManager.js";
import { terminateBubbleTmuxSession } from "../runtime/tmuxManager.js";
import { removeRuntimeSession } from "../runtime/sessionsRegistry.js";
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
