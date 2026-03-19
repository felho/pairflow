import { resolve } from "node:path";

import { GitCommandError } from "../../../core/workspace/git.js";
import type { MergeBubbleResult } from "./mergeCommandContract.js";
import { buildMergeBubbleResult } from "./mergeResultMapping.js";
import type { ResolvedMergeCommandDependencies } from "../../shared/merge/mergeCommandDependencyResolution.js";
import type { NormalizedMergeBubbleInput } from "../../shared/merge/mergeCommandInputNormalization.js";
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

  await dependencies.runGit(["checkout", baseBranch], {
    cwd: repoPath
  });

  try {
    await dependencies.runGit(["merge", "--no-ff", "--no-edit", bubbleBranch], {
      cwd: repoPath
    });
  } catch (error) {
    await dependencies.runGit(["merge", "--abort"], {
      cwd: repoPath,
      allowFailure: true
    }).catch(() => undefined);
    if (error instanceof GitCommandError) {
      throw input.createError(
        `Merge failed for ${bubbleBranch} -> ${baseBranch}. Resolve conflicts manually.`
      );
    }
    throw error;
  }

  const mergeCommitSha = (
    await dependencies.runGit(["rev-parse", "HEAD"], {
      cwd: repoPath
    })
  ).stdout.trim();

  let pushedBaseBranch = false;
  if (input.push || input.deleteRemote) {
    await ensureOriginRemote(repoPath, dependencies.runGit, input.createError);
  }
  if (input.push) {
    await dependencies.runGit(["push", "origin", baseBranch], {
      cwd: repoPath
    });
    pushedBaseBranch = true;
  }

  let deletedRemoteBranch = false;
  if (input.deleteRemote) {
    if (await remoteBranchExists({ repoPath, branch: bubbleBranch, runGitCommand: dependencies.runGit })) {
      const remoteDelete = await dependencies.runGit(
        ["push", "origin", "--delete", bubbleBranch],
        {
          cwd: repoPath,
          allowFailure: true
        }
      );
      if (remoteDelete.exitCode !== 0) {
        if (hasOriginRemoteError(remoteDelete.stderr)) {
          throw input.createError(
            `Failed to delete remote branch ${bubbleBranch}: origin remote is not available.`
          );
        }
        throw input.createError(
          `Failed to delete remote branch ${bubbleBranch}: ${remoteDelete.stderr.trim()}`
        );
      }
      deletedRemoteBranch = true;
    }
  }

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

  await dependencies.writeStateSnapshot(
    resolved.bubblePaths.statePath,
    {
      ...loaded.state,
      last_command_at: input.nowIso
    },
    {
      expectedFingerprint: loaded.fingerprint,
      expectedState: "DONE"
    }
  );

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
