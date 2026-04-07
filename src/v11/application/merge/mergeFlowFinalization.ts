import { persistStateViaMutationBoundary } from "../../shared/mutation/mutationBoundaryIO.js";
import type { ResolvedMergeCommandDependencies } from "./mergeCommandDependencyResolution.js";
import type { RunMergeFlowInput } from "./mergeFlowTypes.js";
import type { MergeFlowExecutionContext } from "./mergeFlowContext.js";

export interface MergeFlowFinalizationResult {
  tmux: Awaited<ReturnType<ResolvedMergeCommandDependencies["terminateBubbleTmuxSession"]>>;
  runtimeSessionRemoved: Awaited<
    ReturnType<ResolvedMergeCommandDependencies["removeRuntimeSession"]>
  >;
  workspaceCleanup: Awaited<
    ReturnType<ResolvedMergeCommandDependencies["cleanupWorktreeWorkspace"]>
  >;
}

export async function finalizeMergeFlow(input: {
  params: RunMergeFlowInput;
  context: MergeFlowExecutionContext;
  dependencies: ResolvedMergeCommandDependencies;
  mergeCommitSha: string;
  pushedBaseBranch: boolean;
  deletedRemoteBranch: boolean;
}): Promise<MergeFlowFinalizationResult> {
  const tmux = await input.dependencies.terminateBubbleTmuxSession({
    bubbleId: input.context.resolved.bubbleId
  });
  const runtimeSessionRemoved = await input.dependencies.removeRuntimeSession({
    sessionsPath: input.context.resolved.bubblePaths.sessionsPath,
    bubbleId: input.context.resolved.bubbleId
  });
  const workspaceCleanup = await input.dependencies.cleanupWorktreeWorkspace({
    repoPath: input.context.resolved.repoPath,
    bubbleBranch: input.context.bubbleBranch,
    worktreePath: input.context.resolved.bubblePaths.worktreePath
  });

  await persistStateViaMutationBoundary({
    write: input.dependencies.writeStateSnapshot,
    statePath: input.context.resolved.bubblePaths.statePath,
    state: {
      ...input.context.loaded.state,
      last_command_at: input.params.nowIso
    },
    options: {
      expectedFingerprint: input.context.loaded.fingerprint,
      expectedState: "DONE"
    }
  });

  await input.dependencies.emitBubbleLifecycleEventBestEffort({
    repoPath: input.context.resolved.repoPath,
    bubbleId: input.context.resolved.bubbleId,
    bubbleInstanceId: input.context.bubbleIdentity.bubbleInstanceId,
    eventType: "bubble_merged",
    round: input.context.loaded.state.round > 0 ? input.context.loaded.state.round : null,
    actorRole: "orchestrator",
    metadata: {
      base_branch: input.context.baseBranch,
      bubble_branch: input.context.bubbleBranch,
      merge_commit_sha: input.mergeCommitSha,
      pushed_base_branch: input.pushedBaseBranch,
      deleted_remote_branch: input.deletedRemoteBranch,
      removed_worktree: workspaceCleanup.removedWorktree,
      removed_bubble_branch: workspaceCleanup.removedBranch
    },
    now: input.params.now
  });

  return {
    tmux,
    runtimeSessionRemoved,
    workspaceCleanup
  };
}
