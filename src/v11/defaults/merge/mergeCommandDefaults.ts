import {
  branchExists,
  runGit
} from "../../defaults/git/gitDefaults.js";
import { ensureBubbleInstanceIdForMutation } from "../../defaults/bubbleIdentity/bubbleIdentityDefaults.js";
import { removeRuntimeSession } from "../../defaults/runtimeSessions/runtimeSessionsDefaults.js";
import { terminateBubbleTmuxSession } from "../../defaults/tmux/tmuxSessionDefaults.js";
import { cleanupWorktreeWorkspace } from "../../defaults/worktree/worktreeWorkspaceDefaults.js";
import type { MergeBubbleDependencies } from "../../application/merge/mergeCommandContract.js";
import { resolveBubbleById } from "../../shared/bubbleLookup/bubbleLookupDefaults.js";
import {
  readStateSnapshot,
  writeStateSnapshot
} from "../../shared/state/stateStoreDefaults.js";
import { emitBubbleLifecycleEventBestEffort } from "../../shared/metrics/bubbleEvents.js";

type MergeBubbleDependencyDefaults = {
  [K in keyof Required<MergeBubbleDependencies>]:
    NonNullable<Required<MergeBubbleDependencies>[K]>;
};

export const mergeBubbleDependencyDefaults = {
  branchExists,
  cleanupWorktreeWorkspace,
  emitBubbleLifecycleEventBestEffort,
  ensureBubbleInstanceIdForMutation,
  readStateSnapshot,
  removeRuntimeSession,
  resolveBubbleById,
  runGit,
  terminateBubbleTmuxSession,
  writeStateSnapshot
} as const satisfies MergeBubbleDependencyDefaults;
