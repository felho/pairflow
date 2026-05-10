import { persistStateViaMutationBoundary } from "../../../../shared/mutation/mutationBoundaryIO.js";
import type { ResolvedMergeCommandDependencies } from "../../mergeCommandDependencyResolution.js";
import type { MergeFlowExecutionContext } from "./mergeFlowContext.js";
import type {
  ExecuteRemoteBubbleMergeCleanupCommandResult,
  MergeCleanupOutcome,
  RunMergeCommandPipelineInput
} from "../../mergeCommandContract.js";

export interface LocalMergeFlowFinalizationResult {
  cleanupOutcome: MergeCleanupOutcome;
}

const MERGE_REMOTE_RECONCILE_FAILED = "MERGE_REMOTE_RECONCILE_FAILED";
const MERGE_REMOTE_CLEANUP_FAILED = "MERGE_REMOTE_CLEANUP_FAILED";
const MERGE_REMOTE_CLEANUP_CONTRACT_INVALID =
  "MERGE_REMOTE_CLEANUP_CONTRACT_INVALID";
const MERGE_REMOTE_CLEANUP_PROOF_MISSING = "MERGE_REMOTE_CLEANUP_PROOF_MISSING";

function resolveCleanupTmuxSessionName(input: {
  primary: string | undefined;
  secondary: string | undefined;
  fallback: string;
}): string {
  return input.primary ?? input.secondary ?? input.fallback;
}

function toRemoteReconcileError(input: {
  params: RunMergeCommandPipelineInput;
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

function buildLocalCleanupOutcome(input: {
  tmux: {
    sessionName: string;
    existed: boolean;
  };
  runtimeSessionRemoved: boolean;
  workspaceCleanup: {
    removedWorktree: boolean;
    removedBranch: boolean;
  };
}): MergeCleanupOutcome {
  return {
    tmuxSessionName: resolveCleanupTmuxSessionName({
      primary: input.tmux.sessionName,
      secondary: undefined,
      fallback: input.tmux.sessionName
    }),
    tmuxSessionExisted: input.tmux.existed,
    runtimeSessionRemoved: input.runtimeSessionRemoved,
    removedWorktree: input.workspaceCleanup.removedWorktree,
    removedBubbleBranch: input.workspaceCleanup.removedBranch
  };
}

function assertRemoteCleanupIdentity(input: {
  params: RunMergeCommandPipelineInput;
  context: Extract<MergeFlowExecutionContext, { route: "remote" }>;
  cleanupResult: ExecuteRemoteBubbleMergeCleanupCommandResult;
}): void {
  const { cleanupResult, context } = input;

  if (cleanupResult.bubbleId !== context.resolved.bubbleId) {
    throw input.params.createError({
      reasonCode: MERGE_REMOTE_CLEANUP_CONTRACT_INVALID,
      message:
        `Remote merge cleanup returned payload for ${cleanupResult.bubbleId} instead of ${context.resolved.bubbleId}.`,
      context: {
        command_name: "merge",
        bubble_id: context.resolved.bubbleId
      }
    });
  }
  if (cleanupResult.baseBranch !== context.baseBranch) {
    throw input.params.createError({
      reasonCode: MERGE_REMOTE_CLEANUP_CONTRACT_INVALID,
      message:
        `Remote merge cleanup base branch mismatch for ${context.resolved.bubbleId}.`,
      context: {
        command_name: "merge",
        bubble_id: context.resolved.bubbleId,
        expected_base_branch: context.baseBranch,
        actual_base_branch: cleanupResult.baseBranch
      }
    });
  }
  if (cleanupResult.bubbleBranch !== context.bubbleBranch) {
    throw input.params.createError({
      reasonCode: MERGE_REMOTE_CLEANUP_CONTRACT_INVALID,
      message:
        `Remote merge cleanup bubble branch mismatch for ${context.resolved.bubbleId}.`,
      context: {
        command_name: "merge",
        bubble_id: context.resolved.bubbleId,
        expected_bubble_branch: context.bubbleBranch,
        actual_bubble_branch: cleanupResult.bubbleBranch
      }
    });
  }
  if (cleanupResult.artifacts.worktree.path !== context.remotePointer.remoteClonePath) {
    throw input.params.createError({
      reasonCode: MERGE_REMOTE_CLEANUP_CONTRACT_INVALID,
      message:
        `Remote merge cleanup returned mismatched clone path for ${context.resolved.bubbleId}.`,
      context: {
        command_name: "merge",
        bubble_id: context.resolved.bubbleId,
        expected_remote_clone_path: context.remotePointer.remoteClonePath,
        actual_remote_clone_path: cleanupResult.artifacts.worktree.path
      }
    });
  }
}

function assertRemoteCleanupProof(
  input: {
    params: RunMergeCommandPipelineInput;
    context: Extract<MergeFlowExecutionContext, { route: "remote" }>;
  },
  proof: {
    existed: boolean;
    cleaned: boolean;
    message: string;
  }
): void {
  if (!proof.existed || proof.cleaned) {
    return;
  }
  throw input.params.createError({
    reasonCode: MERGE_REMOTE_CLEANUP_PROOF_MISSING,
    message: proof.message,
    context: {
      command_name: "merge",
      bubble_id: input.context.resolved.bubbleId
    }
  });
}

function assertRemoteCleanupProofs(input: {
  params: RunMergeCommandPipelineInput;
  context: Extract<MergeFlowExecutionContext, { route: "remote" }>;
  cleanupResult: ExecuteRemoteBubbleMergeCleanupCommandResult;
}): void {
  assertRemoteCleanupProof(input, {
    existed: input.cleanupResult.artifacts.tmux.existed,
    cleaned: input.cleanupResult.tmuxSessionTerminated === true,
    message:
      `Remote merge for '${input.context.resolved.bubbleId}' did not prove tmux cleanup for the remote session.`
  });
  assertRemoteCleanupProof(input, {
    existed: input.cleanupResult.artifacts.runtimeSession.existed,
    cleaned: input.cleanupResult.runtimeSessionRemoved === true,
    message:
      `Remote merge for '${input.context.resolved.bubbleId}' did not prove runtime-session cleanup.`
  });
  assertRemoteCleanupProof(input, {
    existed: input.cleanupResult.artifacts.worktree.existed,
    cleaned: input.cleanupResult.removedWorktree === true,
    message:
      `Remote merge for '${input.context.resolved.bubbleId}' did not prove destructive cleanup of the remote clone.`
  });
  assertRemoteCleanupProof(input, {
    existed: input.cleanupResult.artifacts.branch.existed,
    cleaned: input.cleanupResult.removedBubbleBranch === true,
    message:
      `Remote merge for '${input.context.resolved.bubbleId}' did not prove remote branch cleanup.`
  });
}

function buildRemoteCleanupOutcome(input: {
  context: Extract<MergeFlowExecutionContext, { route: "remote" }>;
  cleanupResult: ExecuteRemoteBubbleMergeCleanupCommandResult;
}): MergeCleanupOutcome {
  return {
    tmuxSessionName: resolveCleanupTmuxSessionName({
      primary: input.cleanupResult.tmuxSessionName,
      secondary: input.cleanupResult.artifacts.tmux.sessionName,
      fallback: input.context.remotePointer.tmuxSession
    }),
    tmuxSessionExisted: input.cleanupResult.artifacts.tmux.existed,
    runtimeSessionRemoved: input.cleanupResult.runtimeSessionRemoved,
    removedWorktree: input.cleanupResult.removedWorktree,
    removedBubbleBranch: input.cleanupResult.removedBubbleBranch
  };
}

function assertRemoteMergeCleanupResult(input: {
  params: RunMergeCommandPipelineInput;
  context: Extract<MergeFlowExecutionContext, { route: "remote" }>;
  cleanupResult: ExecuteRemoteBubbleMergeCleanupCommandResult;
}): MergeCleanupOutcome {
  assertRemoteCleanupIdentity(input);
  assertRemoteCleanupProofs(input);
  return buildRemoteCleanupOutcome({
    context: input.context,
    cleanupResult: input.cleanupResult
  });
}

function extractRemoteCleanupErrorContext(error: unknown): {
  remote_reason_code?: string;
} {
  if (typeof error !== "object" || error === null) {
    return {};
  }

  const candidate = error as {
    code?: unknown;
    context?: {
      remote_reason_code?: unknown;
    };
  };

  const remoteReasonCode =
    typeof candidate.context?.remote_reason_code === "string"
      ? candidate.context.remote_reason_code
      : typeof candidate.code === "string"
        ? candidate.code
        : undefined;

  return remoteReasonCode !== undefined
    ? { remote_reason_code: remoteReasonCode }
    : {};
}

export async function finalizeMergeFlow(input: {
  params: RunMergeCommandPipelineInput;
  context: MergeFlowExecutionContext;
  dependencies: ResolvedMergeCommandDependencies;
  mergeCommitSha: string;
  pushedBaseBranch: boolean;
  deletedRemoteBranch: boolean;
}): Promise<LocalMergeFlowFinalizationResult> {
  if (input.context.route === "remote") {
    return finalizeRemoteMergeFlow({
      ...input,
      context: input.context
    });
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
    cleanupOutcome: buildLocalCleanupOutcome({
      tmux,
      runtimeSessionRemoved,
      workspaceCleanup
    })
  };
}

async function finalizeRemoteMergeFlow(input: {
  params: RunMergeCommandPipelineInput;
  context: Extract<MergeFlowExecutionContext, { route: "remote" }>;
  dependencies: ResolvedMergeCommandDependencies;
  mergeCommitSha: string;
  pushedBaseBranch: boolean;
  deletedRemoteBranch: boolean;
}): Promise<LocalMergeFlowFinalizationResult> {
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

  let cleanupResult: ExecuteRemoteBubbleMergeCleanupCommandResult;
  try {
    cleanupResult = await input.dependencies.executeRemoteBubbleMergeCleanupCommand({
      bubbleId: input.context.resolved.bubbleId,
      remoteClonePath: input.context.remotePointer.remoteClonePath,
      remoteTarget: input.context.remoteTarget,
      baseBranch: input.context.baseBranch,
      bubbleBranch: input.context.bubbleBranch,
      tmuxSessionName: input.context.remotePointer.tmuxSession
    });
  } catch (error) {
    throw input.params.createError({
      reasonCode: MERGE_REMOTE_CLEANUP_FAILED,
      message:
        `Remote merge succeeded for '${input.context.resolved.bubbleId}', but post-success cleanup failed.`,
      context: {
        command_name: "merge",
        bubble_id: input.context.resolved.bubbleId,
        remote_alias: input.context.remoteTarget.alias,
        remote_host: input.context.remoteTarget.host,
        remote_clone_path: input.context.remotePointer.remoteClonePath,
        ...extractRemoteCleanupErrorContext(error)
      },
      cause: error
    });
  }

  const cleanupOutcome = assertRemoteMergeCleanupResult({
    params: input.params,
    context: input.context,
    cleanupResult
  });

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
      route: "remote",
      tmux_session_existed: cleanupOutcome.tmuxSessionExisted,
      runtime_session_removed: cleanupOutcome.runtimeSessionRemoved,
      removed_worktree: cleanupOutcome.removedWorktree,
      removed_bubble_branch: cleanupOutcome.removedBubbleBranch
    },
    now: input.params.now
  }).catch(() => undefined);

  return { cleanupOutcome };
}
