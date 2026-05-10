import type { CommitBubbleInput } from "../../commitCommandContract.js";
import type {
  CommitGitResult,
  CommitRuntimeContext
} from "../../commitCommandApiContract.js";
import type { RunGitPort } from "../../../../ports/git.js";
import { BubbleCommitError } from "../error/commitCommandRuntime.js";
import {
  assertStagedFilesWithinWorktree,
  collectStagedFiles,
  formatCommitErrorMessage
} from "./commitStagedFiles.js";

const CLONE_SOURCE_BRANCH_SYNC_FAILED = "COMMIT_CLONE_SOURCE_BRANCH_SYNC_FAILED";

function parseOutputLines(stdout: string): string[] {
  return [...new Set(stdout
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter((line) => line.length > 0))];
}

function formatGitFailureDetail(result: {
  stdout: string;
  stderr: string;
  exitCode: number;
}): string {
  const detail = result.stderr.trim() || result.stdout.trim();
  return detail.length > 0 ? detail : `git exit code ${result.exitCode}`;
}

function toCloneSourceSyncError(input: {
  bubbleId: string;
  repoPath: string;
  worktreePath: string;
  bubbleBranch: string;
  commitSha?: string | undefined;
  message: string;
  detail?: string | undefined;
}): BubbleCommitError {
  const detailSuffix =
    input.detail !== undefined && input.detail.trim().length > 0
      ? ` Detail: ${input.detail.trim()}`
      : "";
  return new BubbleCommitError(
    formatCommitErrorMessage({
      reasonCode: CLONE_SOURCE_BRANCH_SYNC_FAILED,
      message: `${input.message}${detailSuffix}`,
      context: {
        bubble_id: input.bubbleId,
        command_name: "commit",
        repo_path: input.repoPath,
        worktree_path: input.worktreePath,
        bubble_branch: input.bubbleBranch,
        ...(input.commitSha !== undefined ? { commit_sha: input.commitSha } : {})
      }
    })
  );
}

async function readBranchHeadSha(input: {
  repoPath: string;
  bubbleBranch: string;
  runGit: RunGitPort;
}): Promise<string | null> {
  const resolved = await input.runGit(
    ["rev-parse", "--verify", `refs/heads/${input.bubbleBranch}`],
    {
      cwd: input.repoPath,
      allowFailure: true
    }
  );

  if (resolved.exitCode !== 0) {
    return null;
  }

  const sha = resolved.stdout.trim();
  return sha.length > 0 ? sha : null;
}

async function readBaseBranchHeadSha(input: {
  repoPath: string;
  baseBranch: string;
  runGit: RunGitPort;
}): Promise<string | null> {
  const resolved = await input.runGit(
    ["rev-parse", "--verify", `refs/heads/${input.baseBranch}`],
    {
      cwd: input.repoPath,
      allowFailure: true
    }
  );

  if (resolved.exitCode !== 0) {
    return null;
  }

  const sha = resolved.stdout.trim();
  return sha.length > 0 ? sha : null;
}

async function isSafeToMoveSourceBranch(input: {
  sourceBranchSha: string;
  commitSha: string;
  worktreePath: string;
  runGit: RunGitPort;
}): Promise<boolean> {
  const result = await input.runGit(
    ["merge-base", "--is-ancestor", input.sourceBranchSha, input.commitSha],
    {
      cwd: input.worktreePath,
      allowFailure: true
    }
  );
  return result.exitCode === 0;
}

async function maybeReuseCommittedCloneHead(input: {
  command: CommitBubbleInput;
  context: CommitRuntimeContext;
  runGit: RunGitPort;
}): Promise<CommitGitResult | null> {
  const { resolved } = input.context;
  if (resolved.bubbleConfig.work_mode !== "clone") {
    return null;
  }

  const worktreePath = resolved.bubblePaths.worktreePath;
  const bubbleBranch = resolved.bubbleConfig.bubble_branch;
  const currentBranch = (
    await input.runGit(["rev-parse", "--abbrev-ref", "HEAD"], {
      cwd: worktreePath
    })
  ).stdout.trim();

  const commitSha = (
    await input.runGit(["rev-parse", "HEAD"], {
      cwd: worktreePath
    })
  ).stdout.trim();
  const commitMessage = (
    await input.runGit(["log", "-1", "--pretty=%s", commitSha], {
      cwd: worktreePath
    })
  ).stdout.trim();

  if (currentBranch !== bubbleBranch) {
    throw toCloneSourceSyncError({
      bubbleId: resolved.bubbleId,
      repoPath: resolved.repoPath,
      worktreePath,
      bubbleBranch,
      commitSha,
      message:
        "Clone commit retry requires the retained local HEAD to stay on the bubble branch before source sync/finalization can continue.",
      detail: `Current branch: ${currentBranch}`
    });
  }

  const worktreeStatus = await input.runGit(["status", "--porcelain"], {
    cwd: worktreePath
  });
  if (worktreeStatus.stdout.trim().length > 0) {
    return null;
  }

  const baseBranchSha = await readBaseBranchHeadSha({
    repoPath: resolved.repoPath,
    baseBranch: resolved.bubbleConfig.base_branch,
    runGit: input.runGit
  });
  const sourceBranchSha = await readBranchHeadSha({
    repoPath: resolved.repoPath,
    bubbleBranch,
    runGit: input.runGit
  });
  if (
    sourceBranchSha === null
    && baseBranchSha !== null
    && commitSha === baseBranchSha
  ) {
    return null;
  }
  const stagedFiles = parseOutputLines(
    (
      await input.runGit(
        ["diff-tree", "--no-commit-id", "--name-only", "-r", "-m", commitSha],
        {
          cwd: worktreePath
        }
      )
    ).stdout
  );

  if (
    sourceBranchSha !== null
    && commitSha === sourceBranchSha
    && baseBranchSha !== null
    && commitSha === baseBranchSha
  ) {
    return null;
  }

  return { stagedFiles, commitMessage, commitSha };
}

async function syncCloneSourceBranch(input: {
  context: CommitRuntimeContext;
  commitSha: string;
  runGit: RunGitPort;
}): Promise<void> {
  const { resolved } = input.context;
  if (resolved.bubbleConfig.work_mode !== "clone") {
    return;
  }

  const repoPath = resolved.repoPath;
  const worktreePath = resolved.bubblePaths.worktreePath;
  const bubbleBranch = resolved.bubbleConfig.bubble_branch;
  const bubbleId = resolved.bubbleId;

  const currentBranch = (
    await input.runGit(["rev-parse", "--abbrev-ref", "HEAD"], {
      cwd: worktreePath
    })
  ).stdout.trim();
  if (currentBranch !== bubbleBranch) {
    throw toCloneSourceSyncError({
      bubbleId,
      repoPath,
      worktreePath,
      bubbleBranch,
      commitSha: input.commitSha,
      message:
        "Clone commit source-branch sync requires the clone workspace HEAD to remain on the bubble branch.",
      detail: `Current branch: ${currentBranch}`
    });
  }

  const sourceBranchSha = await readBranchHeadSha({
    repoPath,
    bubbleBranch,
    runGit: input.runGit
  });
  if (sourceBranchSha === null) {
    throw toCloneSourceSyncError({
      bubbleId,
      repoPath,
      worktreePath,
      bubbleBranch,
      commitSha: input.commitSha,
      message: "Clone commit source-branch sync requires an existing source-repo bubble branch."
    });
  }

  if (sourceBranchSha === input.commitSha) {
    return;
  }

  const safeToMove = await isSafeToMoveSourceBranch({
    sourceBranchSha,
    commitSha: input.commitSha,
    worktreePath,
    runGit: input.runGit
  });
  if (!safeToMove) {
    throw toCloneSourceSyncError({
      bubbleId,
      repoPath,
      worktreePath,
      bubbleBranch,
      commitSha: input.commitSha,
      message:
        "Clone commit source-branch sync rejected a diverged or unsafe source branch update."
    });
  }

  const push = await input.runGit(
    [
      "push",
      `--force-with-lease=refs/heads/${bubbleBranch}:${sourceBranchSha}`,
      repoPath,
      `HEAD:refs/heads/${bubbleBranch}`
    ],
    {
      cwd: worktreePath,
      allowFailure: true
    }
  );
  if (push.exitCode !== 0) {
    throw toCloneSourceSyncError({
      bubbleId,
      repoPath,
      worktreePath,
      bubbleBranch,
      commitSha: input.commitSha,
      message: "Clone commit source-branch sync failed while pushing the clone HEAD to the source repo bubble branch.",
      detail: formatGitFailureDetail(push)
    });
  }
}

export async function runCommitGitStep(input: {
  command: CommitBubbleInput;
  context: CommitRuntimeContext;
  stageAll: boolean;
  force: boolean;
  runGit: RunGitPort;
}): Promise<CommitGitResult> {
  if (input.stageAll) {
    await input.runGit(["add", "-A"], {
      cwd: input.context.resolved.bubblePaths.worktreePath
    });
  }

  const stagedFiles = await collectStagedFiles(
    input.context.resolved.bubblePaths.worktreePath,
    input.runGit
  );
  if (stagedFiles.length === 0) {
    if (input.force) {
      const commitMessage =
        input.command.message ?? `bubble(${input.context.resolved.bubbleId}): finalize`;
      await input.runGit(["commit", "--allow-empty", "-m", commitMessage], {
        cwd: input.context.resolved.bubblePaths.worktreePath
      });
      const commitSha = (
        await input.runGit(["rev-parse", "HEAD"], {
          cwd: input.context.resolved.bubblePaths.worktreePath
        })
      ).stdout.trim();

      await syncCloneSourceBranch({
        context: input.context,
        commitSha,
        runGit: input.runGit
      });

      return { stagedFiles, commitMessage, commitSha };
    }

    const reusableCloneCommit = await maybeReuseCommittedCloneHead({
      command: input.command,
      context: input.context,
      runGit: input.runGit
    });
    if (reusableCloneCommit !== null) {
      await syncCloneSourceBranch({
        context: input.context,
        commitSha: reusableCloneCommit.commitSha,
        runGit: input.runGit
      });
      return reusableCloneCommit;
    }

    throw new BubbleCommitError(
      formatCommitErrorMessage({
        reasonCode: "COMMIT_STAGED_FILES_EMPTY",
        message:
          input.stageAll
            ? `No staged files found in bubble worktree even after --stage-all (bubble_id=${input.context.resolved.bubbleId}; command_name=commit).`
            : `No staged files found in bubble worktree. Stage changes before commit, or use \`pairflow bubble commit --stage-all\` (bubble_id=${input.context.resolved.bubbleId}; command_name=commit).`,
        context: {
          bubble_id: input.context.resolved.bubbleId,
          command_name: "commit",
          stage_all: input.stageAll,
          worktree_path: input.context.resolved.bubblePaths.worktreePath
        }
      })
    );
  }

  assertStagedFilesWithinWorktree(
    stagedFiles,
    input.context.resolved.bubblePaths.worktreePath,
    input.context.resolved.bubbleId
  );

  const commitMessage = input.command.message ?? `bubble(${input.context.resolved.bubbleId}): finalize`;
  await input.runGit(["commit", "-m", commitMessage], {
    cwd: input.context.resolved.bubblePaths.worktreePath
  });
  const commitSha = (
    await input.runGit(["rev-parse", "HEAD"], {
      cwd: input.context.resolved.bubblePaths.worktreePath
    })
  ).stdout.trim();

  await syncCloneSourceBranch({
    context: input.context,
    commitSha,
    runGit: input.runGit
  });

  return { stagedFiles, commitMessage, commitSha };
}
