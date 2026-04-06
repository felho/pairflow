import type {
  cleanupWorktreeWorkspace
} from "../../../core/workspace/worktreeManager.js";
import type {
  removeRuntimeSession
} from "../../infrastructure/executor/sessionRuntime/runtimeSessionsRegistry.js";
import type {
  terminateBubbleTmuxSession
} from "../../../core/runtime/tmuxManager.js";
import type {
  GitRunResult
} from "../../../core/workspace/git.js";

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
  terminateBubbleTmuxSession?: typeof terminateBubbleTmuxSession;
  removeRuntimeSession?: typeof removeRuntimeSession;
  cleanupWorktreeWorkspace?: typeof cleanupWorktreeWorkspace;
  runGit?: (
    args: string[],
    options: { cwd: string; allowFailure?: boolean }
  ) => Promise<GitRunResult>;
}
