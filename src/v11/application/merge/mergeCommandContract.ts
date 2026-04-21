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

export interface RemoteMergeStatusTarget {
  alias: string;
  host: string;
  user?: string;
  pairflowCommand: string;
}

export interface RemoteMergeImportSource {
  kind: "git_ref";
  ref: string;
  commitSha: string;
}

export function buildMergeImportRef(bubbleId: string): string {
  return `refs/pairflow/import/${bubbleId}`;
}

export interface ExecuteRemoteBubbleMergeCommandInput {
  bubbleId: string;
  remoteClonePath: string;
  remoteTarget: RemoteMergeStatusTarget;
  baseBranch: string;
  bubbleBranch: string;
  tmuxSessionName?: string;
}

export interface ExecuteRemoteBubbleMergeCommandResult {
  bubbleId: string;
  baseBranch: string;
  bubbleBranch: string;
  mergeCommitSha: string;
  importSource: RemoteMergeImportSource;
  cleanupPending: true;
  tmuxSessionName?: string;
}

export interface ExecuteRemoteBubbleMergeCleanupCommandInput {
  bubbleId: string;
  remoteClonePath: string;
  remoteTarget: RemoteMergeStatusTarget;
  baseBranch: string;
  bubbleBranch: string;
  tmuxSessionName?: string;
}

export interface RemoteMergeCleanupArtifacts {
  worktree: {
    path: string;
    existed: boolean;
  };
  tmux: {
    sessionName?: string;
    existed: boolean;
  };
  runtimeSession: {
    path: string;
    existed: boolean;
  };
  branch: {
    name: string;
    existed: boolean;
  };
}

export interface ExecuteRemoteBubbleMergeCleanupCommandResult {
  bubbleId: string;
  baseBranch: string;
  bubbleBranch: string;
  artifacts: RemoteMergeCleanupArtifacts;
  tmuxSessionTerminated: boolean;
  runtimeSessionRemoved: boolean;
  removedWorktree: boolean;
  removedBubbleBranch: boolean;
  tmuxSessionName?: string;
}

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
