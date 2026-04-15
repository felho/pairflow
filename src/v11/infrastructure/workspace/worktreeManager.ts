import { mkdir, rm } from "node:fs/promises";
import { dirname, resolve } from "node:path";

import {
  branchExists,
  GitCommandError,
  runGit
} from "./git.js";
import type {
  BootstrapWorktreeWorkspacePort,
  CleanupWorktreeWorkspacePort,
  WorktreeBootstrapInput,
  WorktreeBootstrapResult,
  WorktreeCleanupInput,
  WorktreeCleanupResult
} from "../../shared/ports/worktreeWorkspace.js";
import {
  assertGitRepositoryForBootstrap,
  assertGitRepositoryForCleanup,
  assertPathDoesNotExist,
  resolveBaseRef,
  toWorkspaceBootstrapError,
} from "./worktreeManagerErrors.js";
import { syncLocalOverlayEntries } from "./worktreeManagerOverlay.js";
import { isWorktreeRegistered } from "./worktreeManagerRegistry.js";

export { GitCommandError } from "./git.js";
export {
  WorkspaceError,
  WorkspaceBootstrapError,
  WorkspaceCleanupError
} from "./worktreeManagerErrors.js";
export type {
  BootstrapWorktreeWorkspacePort,
  CleanupWorktreeWorkspacePort,
  LocalOverlayConfig,
  WorktreeBootstrapInput,
  WorktreeBootstrapResult,
  WorktreeCleanupInput,
  WorktreeCleanupResult
} from "../../shared/ports/worktreeWorkspace.js";

type CleanupWorkspaceKind = "registered-worktree" | "clone" | "none";
type RequestedBootstrapWorkspaceKind = WorktreeBootstrapResult["workspaceKind"];

export interface CloneWorkspaceBootstrapInput {
  repoPath: string;
  baseBranch: string;
  bubbleBranch: string;
  worktreePath: string;
  localOverlay?: WorktreeBootstrapInput["localOverlay"];
}

function collectGitCleanupFailure(input: {
  args: string[];
  result: Awaited<ReturnType<typeof runGit>>;
  cleanupErrors: unknown[];
}): void {
  if (input.result.exitCode !== 0) {
    input.cleanupErrors.push(
      new GitCommandError(input.args, input.result.exitCode, input.result.stderr)
    );
  }
}

async function cleanupBootstrapArtifacts(input: {
  repoPath: string;
  worktreePath: string;
  bubbleBranch: string;
  workspaceKind: RequestedBootstrapWorkspaceKind;
}): Promise<void> {
  const cleanupErrors: unknown[] = [];

  if (input.workspaceKind === "clone") {
    try {
      await rm(input.worktreePath, { recursive: true, force: true });
    } catch (error) {
      cleanupErrors.push(error);
    }
  } else {
    try {
      const args = ["worktree", "remove", "--force", input.worktreePath];
      const result = await runGit(args, {
        cwd: input.repoPath,
        allowFailure: true
      });
      collectGitCleanupFailure({
        args,
        result,
        cleanupErrors
      });
    } catch (error) {
      cleanupErrors.push(error);
    }
  }

  try {
    const args = ["branch", "-D", input.bubbleBranch];
    const result = await runGit(args, {
      cwd: input.repoPath,
      allowFailure: true
    });
    collectGitCleanupFailure({
      args,
      result,
      cleanupErrors
    });
  } catch (error) {
    cleanupErrors.push(error);
  }

  if (cleanupErrors.length > 0) {
    throw toWorkspaceBootstrapError({
      message:
        `Workspace bootstrap cleanup left partial artifacts for bubble branch ${input.bubbleBranch}.`,
      context: {
        bubbleBranch: input.bubbleBranch,
        repoPath: input.repoPath,
        worktreePath: input.worktreePath,
        reason: "bootstrap_cleanup_incomplete"
      },
      cause:
        cleanupErrors.length === 1
          ? cleanupErrors[0]
          : new AggregateError(cleanupErrors, "workspace bootstrap cleanup failed")
    });
  }
}

async function prepareWorkspaceBootstrap(input: {
  repoPath: string;
  baseBranch: string;
  bubbleBranch: string;
  worktreePath: string;
}): Promise<{
  repoPath: string;
  baseRef: string;
  bubbleBranch: string;
  worktreePath: string;
}> {
  const repoPath = resolve(input.repoPath);
  const worktreePath = resolve(input.worktreePath);

  await assertGitRepositoryForBootstrap(repoPath);

  if (await branchExists(repoPath, input.bubbleBranch)) {
    throw toWorkspaceBootstrapError({
      message: `Bubble branch already exists: ${input.bubbleBranch}`,
      context: {
        bubbleBranch: input.bubbleBranch,
        reason: "bubble_branch_exists",
        repoPath,
        worktreePath
      }
    });
  }

  const baseRef = await resolveBaseRef(repoPath, input.baseBranch);
  await assertPathDoesNotExist(worktreePath);
  await mkdir(dirname(worktreePath), { recursive: true });

  await runGit(["branch", input.bubbleBranch, baseRef], {
    cwd: repoPath
  });

  return {
    repoPath,
    baseRef,
    bubbleBranch: input.bubbleBranch,
    worktreePath
  };
}

function assertExplicitBootstrapWorkspaceKind(input: {
  workspaceKind: WorktreeBootstrapInput["workspaceKind"];
  bubbleBranch: string;
  repoPath: string;
  worktreePath: string;
}): RequestedBootstrapWorkspaceKind {
  if (input.workspaceKind === "worktree" || input.workspaceKind === "clone") {
    return input.workspaceKind;
  }

  throw toWorkspaceBootstrapError({
    message: "Workspace bootstrap requires explicit workspaceKind.",
    context: {
      bubbleBranch: input.bubbleBranch,
      repoPath: input.repoPath,
      worktreePath: input.worktreePath,
      reason: "workspace_kind_missing"
    }
  });
}

async function finalizeWorkspaceBootstrap(input: {
  prepared: Awaited<ReturnType<typeof prepareWorkspaceBootstrap>>;
  localOverlay?: WorktreeBootstrapInput["localOverlay"];
  workspaceKind: RequestedBootstrapWorkspaceKind;
  provisionWorkspace: () => Promise<void>;
}): Promise<WorktreeBootstrapResult> {
  const { prepared } = input;

  try {
    await input.provisionWorkspace();
    await syncLocalOverlayEntries({
      repoPath: prepared.repoPath,
      worktreePath: prepared.worktreePath,
      config: input.localOverlay
    });
  } catch (error) {
    await cleanupBootstrapArtifacts({
      repoPath: prepared.repoPath,
      worktreePath: prepared.worktreePath,
      bubbleBranch: prepared.bubbleBranch,
      workspaceKind: input.workspaceKind
    }).catch((cleanupError: unknown) => {
      throw toWorkspaceBootstrapError({
        message:
          `Workspace bootstrap failed for bubble branch ${prepared.bubbleBranch} and cleanup did not fully complete.`,
        context: {
          bubbleBranch: prepared.bubbleBranch,
          repoPath: prepared.repoPath,
          worktreePath: prepared.worktreePath,
          reason: "bootstrap_failed_with_cleanup_error"
        },
        cause: new AggregateError([error, cleanupError], "bootstrap and cleanup failed")
      });
    });
    throw error;
  }

  return {
    repoPath: prepared.repoPath,
    baseRef: prepared.baseRef,
    bubbleBranch: prepared.bubbleBranch,
    worktreePath: prepared.worktreePath,
    workspacePath: prepared.worktreePath,
    workspaceKind: input.workspaceKind,
    branchPrepared: true
  };
}

async function isGitWorkspace(path: string): Promise<boolean> {
  try {
    const insideWorktree = await runGit(["rev-parse", "--is-inside-work-tree"], {
      cwd: path,
      allowFailure: true
    });
    return insideWorktree.exitCode === 0 && insideWorktree.stdout.trim() === "true";
  } catch {
    return false;
  }
}

async function resolveCleanupWorkspaceKind(
  repoPath: string,
  worktreePath: string
): Promise<CleanupWorkspaceKind> {
  if (await isWorktreeRegistered(repoPath, worktreePath)) {
    return "registered-worktree";
  }

  if (await isGitWorkspace(worktreePath)) {
    return "clone";
  }

  return "none";
}

async function hasCloneBranchOwnership(input: {
  repoPath: string;
  worktreePath: string;
  bubbleBranch: string;
}): Promise<boolean> {
  const cloneHead = await runGit(["rev-parse", "HEAD"], {
    cwd: input.worktreePath,
    allowFailure: true
  });
  if (cloneHead.exitCode !== 0) {
    return false;
  }

  const cloneBranch = await runGit(
    ["rev-parse", "--verify", `refs/heads/${input.bubbleBranch}`],
    {
      cwd: input.worktreePath,
      allowFailure: true
    }
  );
  if (cloneBranch.exitCode !== 0) {
    return false;
  }

  const sourceBranch = await runGit(
    ["rev-parse", "--verify", `refs/heads/${input.bubbleBranch}`],
    {
      cwd: input.repoPath,
      allowFailure: true
    }
  );
  if (sourceBranch.exitCode !== 0) {
    return false;
  }

  const cloneHeadSha = cloneHead.stdout.trim();
  const cloneBranchSha = cloneBranch.stdout.trim();
  const sourceBranchSha = sourceBranch.stdout.trim();
  if (
    cloneHeadSha.length === 0
    || cloneBranchSha.length === 0
    || sourceBranchSha.length === 0
  ) {
    return false;
  }

  return cloneHeadSha === cloneBranchSha && cloneBranchSha === sourceBranchSha;
}

async function bootstrapWorkspace(
  input: WorktreeBootstrapInput
): Promise<WorktreeBootstrapResult> {
  const repoPath = resolve(input.repoPath);
  const worktreePath = resolve(input.worktreePath);
  const workspaceKind = assertExplicitBootstrapWorkspaceKind({
    workspaceKind: input.workspaceKind,
    bubbleBranch: input.bubbleBranch,
    repoPath,
    worktreePath
  });
  const prepared = await prepareWorkspaceBootstrap({
    ...input,
    repoPath,
    worktreePath
  });
  return finalizeWorkspaceBootstrap({
    prepared,
    localOverlay: input.localOverlay,
    workspaceKind,
    provisionWorkspace: async () => {
      if (workspaceKind === "clone") {
        await runGit(["clone", prepared.repoPath, prepared.worktreePath], {
          cwd: prepared.repoPath
        });
        await runGit(["checkout", "--track", `origin/${prepared.bubbleBranch}`], {
          cwd: prepared.worktreePath
        });
        return;
      }

      await runGit(["worktree", "add", prepared.worktreePath, prepared.bubbleBranch], {
        cwd: prepared.repoPath
      });
    }
  });
}

export const bootstrapWorktreeWorkspace: BootstrapWorktreeWorkspacePort = async (
  input: WorktreeBootstrapInput
): Promise<WorktreeBootstrapResult> =>
  bootstrapWorkspace(input);

export async function bootstrapCloneWorkspace(
  input: CloneWorkspaceBootstrapInput
): Promise<WorktreeBootstrapResult> {
  return bootstrapWorkspace({
    ...input,
    workspaceKind: "clone"
  });
}

export const cleanupWorktreeWorkspace: CleanupWorktreeWorkspacePort = async (
  input: WorktreeCleanupInput
): Promise<WorktreeCleanupResult> => {
  const repoPath = resolve(input.repoPath);
  const worktreePath = resolve(input.worktreePath);

  await assertGitRepositoryForCleanup(repoPath);

  const workspaceKind = await resolveCleanupWorkspaceKind(repoPath, worktreePath);
  const canRemoveBranch =
    workspaceKind === "registered-worktree"
      ? true
      : workspaceKind === "clone"
        ? await hasCloneBranchOwnership({
          repoPath,
          worktreePath,
          bubbleBranch: input.bubbleBranch
        })
        : false;

  let removedWorktree = false;
  if (workspaceKind === "registered-worktree") {
    await runGit(["worktree", "remove", "--force", worktreePath], {
      cwd: repoPath
    });
    removedWorktree = true;
  } else if (workspaceKind === "clone") {
    await rm(worktreePath, { recursive: true, force: true });
    removedWorktree = true;
  }

  let removedBranch = false;
  if (canRemoveBranch && await branchExists(repoPath, input.bubbleBranch)) {
    await runGit(["branch", "-D", input.bubbleBranch], {
      cwd: repoPath
    });
    removedBranch = true;
  }

  return {
    repoPath,
    bubbleBranch: input.bubbleBranch,
    worktreePath,
    removedWorktree,
    removedBranch
  };
};
