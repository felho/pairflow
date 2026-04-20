export type OpenWorkspaceKind = "local_worktree" | "remote_clone";

export interface OpenBubbleResult {
  bubbleId: string;
  workspaceKind: OpenWorkspaceKind;
  workspacePath: string;
  worktreePath?: string | undefined;
  remoteAuthority?: string | undefined;
  command: string;
}
