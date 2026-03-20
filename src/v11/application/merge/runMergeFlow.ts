import { resolve } from "node:path";

import { GitCommandError } from "../../../core/workspace/git.js";
import type { MergeBubbleResult } from "./mergeCommandContract.js";
import { buildMergeBubbleResult } from "./mergeResultMapping.js";
import type { ResolvedMergeCommandDependencies } from "../../shared/merge/mergeCommandDependencyResolution.js";
import type { NormalizedMergeBubbleInput } from "../../shared/merge/mergeCommandInputNormalization.js";
import { persistStateViaMutationBoundary } from "../../shared/mutation/mutationBoundaryIO.js";
import {
  assertCleanRepoWorkingTree,
  assertMergeBranchEligibility,
  assertMergeStateEligibility,
  ensureOriginRemote,
  hasOriginRemoteError,
  remoteBranchExists
} from "../../shared/merge/mergeRoutingEligibility.js";

export interface RunMergeFlowInput extends NormalizedMergeBubbleInput {
  createError: (message: string) => Error;
}

const MERGE_CONFLICT_REQUIRES_MANUAL_RESOLUTION =
  "MERGE_CONFLICT_REQUIRES_MANUAL_RESOLUTION";
const MERGE_REMOTE_DELETE_ORIGIN_UNAVAILABLE =
  "MERGE_REMOTE_DELETE_ORIGIN_UNAVAILABLE";
const MERGE_REMOTE_DELETE_FAILED = "MERGE_REMOTE_DELETE_FAILED";

async function mergeBubbleBranchIntoBase(input: {
  repoPath: string;
  baseBranch: string;
  bubbleBranch: string;
  runGit: ResolvedMergeCommandDependencies["runGit"];
  createError: RunMergeFlowInput["createError"];
}): Promise<string> {
  await input.runGit(["checkout", input.baseBranch], {
    cwd: input.repoPath
  });

  try {
    await input.runGit(["merge", "--no-ff", "--no-edit", input.bubbleBranch], {
      cwd: input.repoPath
    });
  } catch (error) {
    await input.runGit(["merge", "--abort"], {
      cwd: input.repoPath,
      allowFailure: true
    }).catch(() => undefined);
    if (error instanceof GitCommandError) {
      throw input.createError(
        `${MERGE_CONFLICT_REQUIRES_MANUAL_RESOLUTION}: Merge failed for ${input.bubbleBranch} -> ${input.baseBranch}. Resolve conflicts manually.`
      );
    }
    throw error;
  }

  return (
    await input.runGit(["rev-parse", "HEAD"], {
      cwd: input.repoPath
    })
  ).stdout.trim();
}

async function runMergeRemoteOperations(input: {
  push: boolean;
  deleteRemote: boolean;
  repoPath: string;
  baseBranch: string;
  bubbleBranch: string;
  runGit: ResolvedMergeCommandDependencies["runGit"];
  createError: RunMergeFlowInput["createError"];
}): Promise<{ pushedBaseBranch: boolean; deletedRemoteBranch: boolean }> {
  let pushedBaseBranch = false;
  let deletedRemoteBranch = false;

  if (input.push || input.deleteRemote) {
    await ensureOriginRemote(input.repoPath, input.runGit, input.createError);
  }
  if (input.push) {
    await input.runGit(["push", "origin", input.baseBranch], {
      cwd: input.repoPath
    });
    pushedBaseBranch = true;
  }

  if (!input.deleteRemote) {
    return { pushedBaseBranch, deletedRemoteBranch };
  }

  if (
    await remoteBranchExists({
      repoPath: input.repoPath,
      branch: input.bubbleBranch,
      runGitCommand: input.runGit
    })
  ) {
    const remoteDelete = await input.runGit(
      ["push", "origin", "--delete", input.bubbleBranch],
      {
        cwd: input.repoPath,
        allowFailure: true
      }
    );
    if (remoteDelete.exitCode !== 0) {
      if (hasOriginRemoteError(remoteDelete.stderr)) {
        throw input.createError(
          `${MERGE_REMOTE_DELETE_ORIGIN_UNAVAILABLE}: Failed to delete remote branch ${input.bubbleBranch}: origin remote is not available.`
        );
      }
      throw input.createError(
        `${MERGE_REMOTE_DELETE_FAILED}: Failed to delete remote branch ${input.bubbleBranch}: ${remoteDelete.stderr.trim()}`
      );
    }
    deletedRemoteBranch = true;
  }

  return { pushedBaseBranch, deletedRemoteBranch };
}

export async function runMergeFlow(
  input: RunMergeFlowInput,
  dependencies: ResolvedMergeCommandDependencies
): Promise<MergeBubbleResult> {
  const resolved = await dependencies.resolveBubbleById({
    bubbleId: input.bubbleId,
    ...(input.repoPath !== undefined ? { repoPath: input.repoPath } : {}),
    ...(input.cwd !== undefined ? { cwd: input.cwd } : {})
  });
  const bubbleIdentity = await dependencies.ensureBubbleInstanceIdForMutation({
    bubbleId: resolved.bubbleId,
    repoPath: resolved.repoPath,
    bubblePaths: resolved.bubblePaths,
    bubbleConfig: resolved.bubbleConfig,
    now: input.now
  });
  resolved.bubbleConfig = bubbleIdentity.bubbleConfig;
  const loaded = await dependencies.readStateSnapshot(resolved.bubblePaths.statePath);
  assertMergeStateEligibility(loaded.state, input.createError);

  const repoPath = resolve(resolved.repoPath);
  const baseBranch = resolved.bubbleConfig.base_branch;
  const bubbleBranch = resolved.bubbleConfig.bubble_branch;

  await assertCleanRepoWorkingTree(repoPath, dependencies.runGit, input.createError);

  const baseBranchExists = await dependencies.branchExists(repoPath, baseBranch);
  const bubbleBranchExists = await dependencies.branchExists(repoPath, bubbleBranch);
  assertMergeBranchEligibility({
    baseBranch,
    bubbleBranch,
    baseBranchExists,
    bubbleBranchExists,
    createError: input.createError
  });

  const mergeCommitSha = await mergeBubbleBranchIntoBase({
    repoPath,
    baseBranch,
    bubbleBranch,
    runGit: dependencies.runGit,
    createError: input.createError
  });

  const { pushedBaseBranch, deletedRemoteBranch } =
    await runMergeRemoteOperations({
      push: input.push,
      deleteRemote: input.deleteRemote,
      repoPath,
      baseBranch,
      bubbleBranch,
      runGit: dependencies.runGit,
      createError: input.createError
    });

  const tmux = await dependencies.terminateBubbleTmuxSession({
    bubbleId: resolved.bubbleId
  });
  const runtimeSessionRemoved = await dependencies.removeRuntimeSession({
    sessionsPath: resolved.bubblePaths.sessionsPath,
    bubbleId: resolved.bubbleId
  });
  const workspaceCleanup = await dependencies.cleanupWorktreeWorkspace({
    repoPath: resolved.repoPath,
    bubbleBranch,
    worktreePath: resolved.bubblePaths.worktreePath
  });

  await persistStateViaMutationBoundary({
    write: dependencies.writeStateSnapshot,
    statePath: resolved.bubblePaths.statePath,
    state: {
      ...loaded.state,
      last_command_at: input.nowIso
    },
    options: {
      expectedFingerprint: loaded.fingerprint,
      expectedState: "DONE"
    }
  });

  await dependencies.emitBubbleLifecycleEventBestEffort({
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
    now: input.now
  });

  return buildMergeBubbleResult({
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
  });
}
