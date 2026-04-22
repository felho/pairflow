import type {
  CleanupWorktreeWorkspacePort
} from "../../shared/ports/worktreeWorkspace.js";
import type {
  RemoveRuntimeSessionPort
} from "../../shared/ports/runtimeSessions.js";
import type {
  TerminateBubbleTmuxSessionPort
} from "../../shared/ports/tmuxSessions.js";
import type { RunGitPort } from "../../shared/ports/git.js";
import type { ResolveBubbleByIdPort } from "../../shared/ports/bubbleLookup.js";
import type {
  ReadStateSnapshotPort,
  WriteStateSnapshotPort
} from "../../shared/ports/stateSnapshots.js";
import type { BranchExistsPort } from "../../shared/ports/git.js";
import type { EnsureBubbleInstanceIdForMutationPort } from "../../shared/ports/bubbleIdentity.js";
import type { EmitBubbleLifecycleEventBestEffortPort } from "../../shared/metrics/bubbleEvents.js";
import type {
  BubbleRemotePointerCreated,
  BubbleRemotePointerStarted
} from "../../../types/bubble.js";
import type {
  ExecuteRemoteBubbleMergeCleanupCommandInput,
  ExecuteRemoteBubbleMergeCleanupCommandResult,
  ExecuteRemoteBubbleMergeCommandInput,
  ExecuteRemoteBubbleMergeCommandResult,
  RemoteMergeStatusTarget
} from "../../shared/merge/remoteMergeContract.js";
export type {
  ExecuteRemoteBubbleMergeCleanupCommandInput,
  ExecuteRemoteBubbleMergeCleanupCommandResult,
  ExecuteRemoteBubbleMergeCommandInput,
  ExecuteRemoteBubbleMergeCommandResult,
  RemoteMergeCleanupArtifacts,
  RemoteMergeImportSource,
  RemoteMergeStatusTarget
} from "../../shared/merge/remoteMergeContract.js";
export { buildMergeImportRef } from "../../shared/merge/remoteMergeContract.js";

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
}
