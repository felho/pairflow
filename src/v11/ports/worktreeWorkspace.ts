import type {
  WorkMode
} from "../shared/config/bubbleConfigVocabulary.js";
import type {
  BubbleLocalOverlayConfig
} from "../shared/workspace/localOverlayTypes.js";

export type WorkspaceKind = WorkMode;

export interface WorktreeBootstrapInput {
  repoPath: string;
  baseBranch: string;
  bubbleBranch: string;
  worktreePath: string;
  workspaceKind: WorkspaceKind;
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

export type LocalOverlayConfig = BubbleLocalOverlayConfig;

export type BootstrapWorktreeWorkspacePort = (
  input: WorktreeBootstrapInput
) => Promise<WorktreeBootstrapResult>;

export type CleanupWorktreeWorkspacePort = (
  input: WorktreeCleanupInput
) => Promise<WorktreeCleanupResult>;
