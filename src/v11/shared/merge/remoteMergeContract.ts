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
