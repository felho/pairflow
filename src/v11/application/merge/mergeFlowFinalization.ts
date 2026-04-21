import { persistStateViaMutationBoundary } from "../../shared/mutation/mutationBoundaryIO.js";
import type { ResolvedMergeCommandDependencies } from "./mergeCommandDependencyResolution.js";
import type { RunMergeFlowInput } from "./mergeFlowTypes.js";
import type { MergeFlowExecutionContext } from "./mergeFlowContext.js";
import type { TerminateBubbleTmuxSessionResult } from "../../shared/ports/tmuxSessions.js";

export interface LocalMergeFlowFinalizationResult {
  tmux: TerminateBubbleTmuxSessionResult;
  runtimeSessionRemoved: Awaited<
    ReturnType<ResolvedMergeCommandDependencies["removeRuntimeSession"]>
  >;
  workspaceCleanup: {
    removedWorktree: boolean;
    removedBranch: boolean;
  };
}

const MERGE_REMOTE_RECONCILE_FAILED = "MERGE_REMOTE_RECONCILE_FAILED";

function toRemoteReconcileError(input: {
  params: RunMergeFlowInput;
  context: Extract<MergeFlowExecutionContext, { route: "remote" }>;
  phase: "state_persist";
  error: unknown;
}): never {
  const reason = input.error instanceof Error ? input.error.message : String(input.error);
  throw input.params.createError({
    reasonCode: MERGE_REMOTE_RECONCILE_FAILED,
    message:
      `Remote merge succeeded for '${input.context.resolved.bubbleId}', but local reconcile failed during ${input.phase}: ${reason}`,
    context: {
      command_name: "merge",
      bubble_id: input.context.resolved.bubbleId,
      reconcile_phase: input.phase,
      state_path: input.context.resolved.bubblePaths.statePath
    },
    cause: input.error
  });
}

export async function finalizeMergeFlow(input: {
  params: RunMergeFlowInput;
  context: MergeFlowExecutionContext;
  dependencies: ResolvedMergeCommandDependencies;
  mergeCommitSha: string;
  pushedBaseBranch: boolean;
  deletedRemoteBranch: boolean;
}): Promise<LocalMergeFlowFinalizationResult> {
  if (input.context.route === "remote") {
    let runtimeSessionRemoved = false;

    try {
      await persistStateViaMutationBoundary({
        write: input.dependencies.writeStateSnapshot,
        statePath: input.context.resolved.bubblePaths.statePath,
        state: {
          ...input.context.loaded.state,
          last_command_at: input.context.nowIso
        },
        options: {
          expectedFingerprint: input.context.loaded.fingerprint,
          expectedState: "DONE"
        }
      });
    } catch (error) {
      toRemoteReconcileError({
        params: input.params,
        context: input.context,
        phase: "state_persist",
        error
      });
    }

    try {
      runtimeSessionRemoved = await input.dependencies.removeRuntimeSession({
        sessionsPath: input.context.resolved.bubblePaths.sessionsPath,
        bubbleId: input.context.resolved.bubbleId
      });
    } catch {
      runtimeSessionRemoved = false;
    }

    await input.dependencies.emitBubbleLifecycleEventBestEffort({
      repoPath: input.context.resolved.repoPath,
      bubbleId: input.context.resolved.bubbleId,
      bubbleInstanceId: input.context.bubbleIdentity.bubbleInstanceId,
      eventType: "bubble_merged",
      round: input.context.state.round > 0 ? input.context.state.round : null,
      actorRole: "orchestrator",
      metadata: {
        base_branch: input.context.baseBranch,
        bubble_branch: input.context.bubbleBranch,
        merge_commit_sha: input.mergeCommitSha,
        pushed_base_branch: input.pushedBaseBranch,
        deleted_remote_branch: input.deletedRemoteBranch,
        route: "remote"
      },
      now: input.params.now
    }).catch(() => undefined);

    return {
      tmux: {
        sessionName: input.context.remotePointer.tmuxSession,
        existed: false
      },
      runtimeSessionRemoved,
      workspaceCleanup: {
        removedWorktree: false,
        removedBranch: false
      }
    };
  }

  const tmux = await input.dependencies.terminateBubbleTmuxSession({
    bubbleId: input.context.resolved.bubbleId
  });
  const runtimeSessionRemoved = await input.dependencies.removeRuntimeSession({
    sessionsPath: input.context.resolved.bubblePaths.sessionsPath,
    bubbleId: input.context.resolved.bubbleId
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

  const workspaceCleanup = await input.dependencies.cleanupWorktreeWorkspace({
    repoPath: input.context.resolved.repoPath,
    bubbleBranch: input.context.bubbleBranch,
    worktreePath: input.context.resolved.bubblePaths.worktreePath
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
