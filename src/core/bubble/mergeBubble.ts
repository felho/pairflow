import { resolve } from "node:path";

import { readStateSnapshot, writeStateSnapshot } from "../state/stateStore.js";
import { runGit, branchExists, type GitRunResult, GitCommandError } from "../workspace/git.js";
import { BubbleLookupError, resolveBubbleById } from "./bubbleLookup.js";
import {
  cleanupWorktreeWorkspace,
  WorkspaceCleanupError
} from "../workspace/worktreeManager.js";
import {
  terminateBubbleTmuxSession,
  TmuxCommandError
} from "../runtime/tmuxManager.js";
import {
  removeRuntimeSession,
  RuntimeSessionsRegistryError,
  RuntimeSessionsRegistryLockError
} from "../runtime/sessionsRegistry.js";
import { ensureBubbleInstanceIdForMutation } from "./bubbleInstanceId.js";
import { emitBubbleLifecycleEventBestEffort } from "../metrics/bubbleEvents.js";

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

export class BubbleMergeError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "BubbleMergeError";
  }
}

type GitRunner = (
  args: string[],
  options: { cwd: string; allowFailure?: boolean }
) => Promise<GitRunResult>;

function hasOriginRemoteError(stderr: string): boolean {
  const normalized = stderr.toLowerCase();
  return (
    normalized.includes("no such remote") ||
    normalized.includes("not appear to be a git repository")
  );
}

async function assertCleanRepoWorkingTree(
  repoPath: string,
  runGitCommand: GitRunner
): Promise<void> {
  const status = await runGitCommand(["status", "--porcelain"], {
    cwd: repoPath
  });
  const blockingLines = status.stdout
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .filter(
      (line) =>
        !line.endsWith(" .pairflow") &&
        !line.includes(" .pairflow/") &&
        !line.startsWith("?? .pairflow") &&
        !line.startsWith("?? .pairflow/")
    );
  if (blockingLines.length > 0) {
    throw new BubbleMergeError(
      `Repository has uncommitted changes at ${repoPath}. Commit/stash them before bubble merge.`
    );
  }
}

async function ensureOriginRemote(
  repoPath: string,
  runGitCommand: GitRunner
): Promise<void> {
  const origin = await runGitCommand(["remote", "get-url", "origin"], {
    cwd: repoPath,
    allowFailure: true
  });
  if (origin.exitCode !== 0) {
    throw new BubbleMergeError(
      `Remote origin is required for push/delete-remote operations at ${repoPath}.`
    );
  }
}

async function remoteBranchExists(input: {
  repoPath: string;
  branch: string;
  runGitCommand: GitRunner;
}): Promise<boolean> {
  const result = await input.runGitCommand(
    ["ls-remote", "--heads", "origin", input.branch],
    {
      cwd: input.repoPath,
      allowFailure: true
    }
  );
  return result.exitCode === 0 && result.stdout.trim().length > 0;
}

export async function mergeBubble(
  input: MergeBubbleInput,
  dependencies: MergeBubbleDependencies = {}
): Promise<MergeBubbleResult> {
  const now = input.now ?? new Date();
  const nowIso = now.toISOString();
  const push = input.push ?? false;
  const deleteRemote = input.deleteRemote ?? false;

  const terminateTmux =
    dependencies.terminateBubbleTmuxSession ?? terminateBubbleTmuxSession;
  const removeSession = dependencies.removeRuntimeSession ?? removeRuntimeSession;
  const cleanup = dependencies.cleanupWorktreeWorkspace ?? cleanupWorktreeWorkspace;
  const runGitCommand = dependencies.runGit ?? runGit;

  const resolved = await resolveBubbleById({
    bubbleId: input.bubbleId,
    ...(input.repoPath !== undefined ? { repoPath: input.repoPath } : {}),
    ...(input.cwd !== undefined ? { cwd: input.cwd } : {})
  });
  const bubbleIdentity = await ensureBubbleInstanceIdForMutation({
    bubbleId: resolved.bubbleId,
    repoPath: resolved.repoPath,
    bubblePaths: resolved.bubblePaths,
    bubbleConfig: resolved.bubbleConfig,
    now
  });
  resolved.bubbleConfig = bubbleIdentity.bubbleConfig;
  const loaded = await readStateSnapshot(resolved.bubblePaths.statePath);
  if (loaded.state.state !== "DONE") {
    throw new BubbleMergeError(
      `bubble merge requires state DONE (current: ${loaded.state.state}).`
    );
  }

  const repoPath = resolve(resolved.repoPath);
  const baseBranch = resolved.bubbleConfig.base_branch;
  const bubbleBranch = resolved.bubbleConfig.bubble_branch;

  await assertCleanRepoWorkingTree(repoPath, runGitCommand);

  if (!(await branchExists(repoPath, baseBranch))) {
    throw new BubbleMergeError(`Base branch not found locally: ${baseBranch}`);
  }
  if (!(await branchExists(repoPath, bubbleBranch))) {
    throw new BubbleMergeError(`Bubble branch not found locally: ${bubbleBranch}`);
  }
  if (baseBranch === bubbleBranch) {
    throw new BubbleMergeError("Base branch and bubble branch cannot be identical.");
  }

  await runGitCommand(["checkout", baseBranch], {
    cwd: repoPath
  });

  try {
    await runGitCommand(["merge", "--no-ff", "--no-edit", bubbleBranch], {
      cwd: repoPath
    });
  } catch (error) {
    await runGitCommand(["merge", "--abort"], {
      cwd: repoPath,
      allowFailure: true
    }).catch(() => undefined);
    if (error instanceof GitCommandError) {
      throw new BubbleMergeError(
        `Merge failed for ${bubbleBranch} -> ${baseBranch}. Resolve conflicts manually.`
      );
    }
    throw error;
  }

  const mergeCommitSha = (
    await runGitCommand(["rev-parse", "HEAD"], {
      cwd: repoPath
    })
  ).stdout.trim();

  let pushedBaseBranch = false;
  if (push || deleteRemote) {
    await ensureOriginRemote(repoPath, runGitCommand);
  }
  if (push) {
    await runGitCommand(["push", "origin", baseBranch], {
      cwd: repoPath
    });
    pushedBaseBranch = true;
  }

  let deletedRemoteBranch = false;
  if (deleteRemote) {
    if (await remoteBranchExists({ repoPath, branch: bubbleBranch, runGitCommand })) {
      const remoteDelete = await runGitCommand(
        ["push", "origin", "--delete", bubbleBranch],
        {
          cwd: repoPath,
          allowFailure: true
        }
      );
      if (remoteDelete.exitCode !== 0) {
        if (hasOriginRemoteError(remoteDelete.stderr)) {
          throw new BubbleMergeError(
            `Failed to delete remote branch ${bubbleBranch}: origin remote is not available.`
          );
        }
        throw new BubbleMergeError(
          `Failed to delete remote branch ${bubbleBranch}: ${remoteDelete.stderr.trim()}`
        );
      }
      deletedRemoteBranch = true;
    }
  }

  const tmux = await terminateTmux({
    bubbleId: resolved.bubbleId
  });
  const runtimeSessionRemoved = await removeSession({
    sessionsPath: resolved.bubblePaths.sessionsPath,
    bubbleId: resolved.bubbleId
  });
  const workspaceCleanup = await cleanup({
    repoPath: resolved.repoPath,
    bubbleBranch,
    worktreePath: resolved.bubblePaths.worktreePath
  });

  await writeStateSnapshot(
    resolved.bubblePaths.statePath,
    {
      ...loaded.state,
      last_command_at: nowIso
    },
    {
      expectedFingerprint: loaded.fingerprint,
      expectedState: "DONE"
    }
  );

  await emitBubbleLifecycleEventBestEffort({
    repoPath: resolved.repoPath,
    bubbleId: resolved.bubbleId,
    bubbleInstanceId: bubbleIdentity.bubbleInstanceId,
    eventType: "bubble_merged",
    round: loaded.state.round > 0 ? loaded.state.round : null,
    actorRole: "orchestrator",
    metadata: {
      base_branch: baseBranch,
      bubble_branch: bubbleBranch,
      merge_commit_sha: mergeCommitSha,
      pushed_base_branch: pushedBaseBranch,
      deleted_remote_branch: deletedRemoteBranch,
      removed_worktree: workspaceCleanup.removedWorktree,
      removed_bubble_branch: workspaceCleanup.removedBranch
    },
    now
  });

  return {
    bubbleId: resolved.bubbleId,
    baseBranch,
    bubbleBranch,
    mergeCommitSha,
    pushedBaseBranch,
    deletedRemoteBranch,
    tmuxSessionName: tmux.sessionName,
    tmuxSessionExisted: tmux.existed,
    runtimeSessionRemoved,
    removedWorktree: workspaceCleanup.removedWorktree,
    removedBubbleBranch: workspaceCleanup.removedBranch
  };
}

export function asBubbleMergeError(error: unknown): never {
  if (error instanceof BubbleMergeError) {
    throw error;
  }
  if (error instanceof BubbleLookupError) {
    throw new BubbleMergeError(error.message);
  }
  if (error instanceof GitCommandError) {
    throw new BubbleMergeError(error.message);
  }
  if (error instanceof WorkspaceCleanupError) {
    throw new BubbleMergeError(error.message);
  }
  if (error instanceof TmuxCommandError) {
    throw new BubbleMergeError(error.message);
  }
  if (
    error instanceof RuntimeSessionsRegistryError ||
    error instanceof RuntimeSessionsRegistryLockError
  ) {
    throw new BubbleMergeError(error.message);
  }
  if (error instanceof Error) {
    throw new BubbleMergeError(error.message);
  }
  throw error;
}
