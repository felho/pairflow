import { rename, writeFile } from "node:fs/promises";

import {
  branchExists,
  runGit
} from "../../infrastructure/workspace/git.js";
import { ensureBubbleInstanceIdForMutation } from "../../infrastructure/artifact/bubble/bubbleInstanceId.js";
import { removeRuntimeSession } from "../runtimeSessions/runtimeSessionsDefaults.js";
import { terminateBubbleTmuxSession } from "../../infrastructure/channel/tmux/tmuxManager.js";
import { cleanupWorktreeWorkspace } from "../../infrastructure/workspace/worktreeManager.js";
import type { MergeBubbleDependencies } from "../../application/merge/mergeCommandContract.js";
import { resolveBubbleById } from "../../infrastructure/executor/workspace/bubbleLookup.js";
import {
  readStateSnapshot as readStateSnapshotPersisted,
  writeStateSnapshot as writeStateSnapshotPersisted
} from "../../infrastructure/state/stateStore.js";
import {
} from "../../shared/mutation/mutationBoundaryIO.js";

// Adapt persisted-shape infrastructure ports into domain-variant ports at
// the defaults boundary so the merge lane holds BubbleStateSnapshot
// end-to-end through its dependency contract.
const readStateSnapshot = readStateSnapshotPersisted;
const writeStateSnapshot = writeStateSnapshotPersisted;
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
