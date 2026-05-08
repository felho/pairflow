import type {
  CleanupWorktreeWorkspacePort
} from "../../ports/worktreeWorkspace.js";
import type {
  RemoveRuntimeSessionPort
} from "../../ports/runtimeSessions.js";
import type {
  TerminateBubbleTmuxSessionPort
} from "../../ports/tmuxSessions.js";
import type { RunGitPort } from "../../ports/git.js";
import type { ResolveBubbleByIdPort } from "../../ports/bubbleLookup.js";
import type {
  ReadStateSnapshotPort,
  WriteStateSnapshotPort
} from "../../ports/stateSnapshots.js";
import type { BranchExistsPort } from "../../ports/git.js";
import type { EnsureBubbleInstanceIdForMutationPort } from "../../ports/bubbleIdentity.js";
import type { EmitBubbleLifecycleEventBestEffortPort } from "../../shared/metrics/bubbleEvents.js";
import type {
  BubbleRemotePointerCreated,
  BubbleRemotePointerStarted
} from "../../shared/remote/remoteExecutionTypes.js";
import type {
  ExecuteRemoteBubbleMergeCleanupCommandInput,
  ExecuteRemoteBubbleMergeCleanupCommandResult,
  ExecuteRemoteBubbleMergeCommandInput,
  ExecuteRemoteBubbleMergeCommandResult,
  RemoteMergeStatusTarget
} from "../../shared/remote/remoteMergeContract.js";
import type { ImportRemoteBubbleCommitContinuityPort } from "../commit/commitRemotePorts.js";
export type {
  ExecuteRemoteBubbleMergeCleanupCommandInput,
  ExecuteRemoteBubbleMergeCleanupCommandResult,
  ExecuteRemoteBubbleMergeCommandInput,
  ExecuteRemoteBubbleMergeCommandResult,
  RemoteMergeCleanupArtifacts,
  RemoteMergeImportSource,
  RemoteMergeStatusTarget
} from "../../shared/remote/remoteMergeContract.js";
export { buildMergeImportRef } from "../../shared/remote/remoteMergeContract.js";

export interface MergeCleanupOutcome {
  tmuxSessionName: string;
  tmuxSessionExisted: boolean;
  runtimeSessionRemoved: boolean;
  removedWorktree: boolean;
  removedBubbleBranch: boolean;
}

export interface MergeBubbleInput {
  bubbleId: string;
  repoPath?: string | undefined;
  cwd?: string | undefined;
  push?: boolean | undefined;
  deleteRemote?: boolean | undefined;
  now?: Date | undefined;
}

export interface MergeBubbleResult {
  bubbleId: string;
  baseBranch: string;
  bubbleBranch: string;
  mergeCommitSha: string;
  presentationRoute: "local" | "started_remote";
  pushedBaseBranch: boolean;
  deletedRemoteBranch: boolean;
  tmuxSessionName: string;
  tmuxSessionExisted: boolean;
  runtimeSessionRemoved: boolean;
  removedWorktree: boolean;
  removedBubbleBranch: boolean;
}

export interface MergeBubbleDependencies {
  terminateBubbleTmuxSession?: TerminateBubbleTmuxSessionPort;
  removeRuntimeSession?: RemoveRuntimeSessionPort;
  cleanupWorktreeWorkspace?: CleanupWorktreeWorkspacePort;
  runGit?: RunGitPort;
  resolveBubbleById?: ResolveBubbleByIdPort;
  readStateSnapshot?: ReadStateSnapshotPort;
  writeStateSnapshot?: WriteStateSnapshotPort;
  branchExists?: BranchExistsPort;
  ensureBubbleInstanceIdForMutation?: EnsureBubbleInstanceIdForMutationPort;
  emitBubbleLifecycleEventBestEffort?: EmitBubbleLifecycleEventBestEffortPort;
  readRemotePointer?: (
    path: string
  ) => Promise<BubbleRemotePointerStarted | BubbleRemotePointerCreated | null>;
  resolveRemoteBubbleStatusTarget?: (input: {
    bubbleId: string;
    remoteAlias: string;
    expectedHost?: string;
  }) => Promise<RemoteMergeStatusTarget>;
  executeRemoteBubbleMergeCommand?: (
    input: ExecuteRemoteBubbleMergeCommandInput
  ) => Promise<ExecuteRemoteBubbleMergeCommandResult>;
  executeRemoteBubbleMergeCleanupCommand?: (
    input: ExecuteRemoteBubbleMergeCleanupCommandInput
  ) => Promise<ExecuteRemoteBubbleMergeCleanupCommandResult>;
  importRemoteBubbleCommitContinuity?: ImportRemoteBubbleCommitContinuityPort;
  renamePath?: (fromPath: string, toPath: string) => Promise<void>;
  writeTextFile?: (path: string, content: string) => Promise<void>;
}
