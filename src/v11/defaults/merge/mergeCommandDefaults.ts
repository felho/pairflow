import { rename, writeFile } from "node:fs/promises";

import {
  branchExists,
  runGit
} from "../../defaults/git/gitDefaults.js";
import { ensureBubbleInstanceIdForMutation } from "../../defaults/bubbleIdentity/bubbleIdentityDefaults.js";
import { removeRuntimeSession } from "../../defaults/runtimeSessions/runtimeSessionsDefaults.js";
import { terminateBubbleTmuxSession } from "../../defaults/tmux/tmuxSessionDefaults.js";
import { cleanupWorktreeWorkspace } from "../../defaults/worktree/worktreeWorkspaceDefaults.js";
import type { MergeBubbleDependencies } from "../../application/merge/mergeCommandContract.js";
import { resolveBubbleById } from "../bubbleLookup/bubbleLookupDefaults.js";
import {
  readStateSnapshot,
  writeStateSnapshot
} from "../state/stateStoreDefaults.js";
import { emitBubbleLifecycleEventBestEffort } from "../metrics/bubbleEvents.js";
import { readRemotePointer } from "../../infrastructure/artifact/bubble/remoteExecutionArtifacts.js";
import {
  executeRemoteBubbleMergeCleanupCommand,
  executeRemoteBubbleMergeCommand
} from "../../infrastructure/executor/ssh/sshBubbleMergeCommand.js";
import { importRemoteBubbleCommitContinuity } from "../../infrastructure/executor/ssh/sshBubbleCommitContinuityImportCommand.js";
import { statusCommandDependencyDefaults } from "../status/statusCommandDependencyDefaults.js";

type MergeBubbleDependencyDefaults = {
  [K in keyof Required<MergeBubbleDependencies>]:
    NonNullable<Required<MergeBubbleDependencies>[K]>;
};

export const mergeBubbleDependencyDefaults = {
  branchExists,
  cleanupWorktreeWorkspace,
  executeRemoteBubbleMergeCleanupCommand,
  executeRemoteBubbleMergeCommand,
  importRemoteBubbleCommitContinuity,
  emitBubbleLifecycleEventBestEffort,
  ensureBubbleInstanceIdForMutation,
  readRemotePointer,
  readStateSnapshot,
  removeRuntimeSession,
  resolveRemoteBubbleStatusTarget:
    statusCommandDependencyDefaults.resolveRemoteBubbleStatusTarget,
  resolveBubbleById,
  runGit,
  terminateBubbleTmuxSession,
  renamePath: rename,
  writeTextFile: async (path: string, content: string) => {
    await writeFile(path, content, "utf8");
  },
  writeStateSnapshot
} as const satisfies MergeBubbleDependencyDefaults;
