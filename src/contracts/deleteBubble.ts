// This contract is mirrored in ui/src/lib/types.ts to avoid cross-package UI imports.
// Keep both definitions aligned whenever fields are added, removed, or renamed.
export interface DeleteBubbleArtifacts {
  worktree: {
    exists: boolean;
    path: string;
  };
  tmux: {
    exists: boolean;
    sessionName: string;
  };
  runtimeSession: {
    exists: boolean;
    sessionName: string | null;
  };
  branch: {
    exists: boolean;
    name: string;
  };
}

export interface DeleteBubbleResult {
  bubbleId: string;
  deleted: boolean;
  requiresConfirmation: boolean;
  artifacts: DeleteBubbleArtifacts;
  tmuxSessionTerminated: boolean;
  runtimeSessionRemoved: boolean;
  removedWorktree: boolean;
  removedBubbleBranch: boolean;
}
