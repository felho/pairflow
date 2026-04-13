import type {
  LocalOverlayMode,
  WorkMode
} from "../../../types/bubble.js";

export type WorkspaceKind = WorkMode;

export interface WorktreeBootstrapInput {
  repoPath: string;
  baseBranch: string;
  bubbleBranch: string;
  worktreePath: string;
  localOverlay?: LocalOverlayConfig | undefined;
}

export interface WorktreeBootstrapResult {
  repoPath: string;
  baseRef: string;
  bubbleBranch: string;
  worktreePath: string;
  workspacePath: string;
  workspaceKind: WorkspaceKind;
  branchPrepared: boolean;
}

export interface WorktreeCleanupInput {
  repoPath: string;
  bubbleBranch: string;
  worktreePath: string;
}

export interface WorktreeCleanupResult {
  repoPath: string;
  bubbleBranch: string;
  worktreePath: string;
  removedWorktree: boolean;
  removedBranch: boolean;
}

export interface LocalOverlayConfig {
  enabled: boolean;
  mode: LocalOverlayMode;
  entries: string[];
}

export type BootstrapWorktreeWorkspacePort = (
  input: WorktreeBootstrapInput
) => Promise<WorktreeBootstrapResult>;

export type CleanupWorktreeWorkspacePort = (
  input: WorktreeCleanupInput
) => Promise<WorktreeCleanupResult>;
