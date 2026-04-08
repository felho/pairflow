import { emitBubbleLifecycleEventBestEffort } from "../../../v11/shared/metrics/bubbleEvents.js";
import type {
  DeleteBubbleArtifacts
} from "../../../contracts/deleteBubble.js";
import type {
  DeleteBubbleInput,
  DeleteExecutionContext,
  DeleteRuntimeCleanupResult,
  DeleteWorkspaceCleanupResult,
  ResolvedBubble,
  ResolvedDeleteDependencies
} from "./deleteBubbleSupport.js";

export async function createDeleteArchive(input: {
  input: DeleteBubbleInput;
  resolved: ResolvedBubble;
  execution: DeleteExecutionContext;
  dependencies: ResolvedDeleteDependencies;
  now: Date;
  inferCreatedAtFromBubbleInstanceId: (bubbleInstanceId: string) => string | null;
  toDeleteStepError: (input: {
    bubbleId: string;
    bubbleInstanceId: string;
    step: "snapshot" | "index";
    error: unknown;
  }) => Error;
}): Promise<void> {
  const createdAt = input.inferCreatedAtFromBubbleInstanceId(
    input.execution.bubbleInstanceId
  );

  let archivePath: string;
  try {
    const snapshot = await input.dependencies.createArchiveSnapshot({
      repoPath: input.resolved.repoPath,
      bubbleId: input.resolved.bubbleId,
      bubbleInstanceId: input.execution.bubbleInstanceId,
      bubbleDir: input.resolved.bubblePaths.bubbleDir,
      locksDir: input.dependencies.archiveLocksDir,
      ...(input.input.archiveRootPath !== undefined
        ? { archiveRootPath: input.input.archiveRootPath }
        : {}),
      now: input.now
    });
    archivePath = snapshot.archivePath;
  } catch (error) {
    throw input.toDeleteStepError({
      bubbleId: input.resolved.bubbleId,
      bubbleInstanceId: input.execution.bubbleInstanceId,
      step: "snapshot",
      error
    });
  }

  try {
    await input.dependencies.upsertDeletedArchiveIndexEntry({
      repoPath: input.resolved.repoPath,
      bubbleId: input.resolved.bubbleId,
      bubbleInstanceId: input.execution.bubbleInstanceId,
      archivePath,
      locksDir: input.dependencies.archiveLocksDir,
      createdAt,
      ...(input.input.archiveRootPath !== undefined
        ? { archiveRootPath: input.input.archiveRootPath }
        : {}),
      now: input.now
    });
  } catch (error) {
    throw input.toDeleteStepError({
      bubbleId: input.resolved.bubbleId,
      bubbleInstanceId: input.execution.bubbleInstanceId,
      step: "index",
      error
    });
  }
}

export async function cleanupDeleteWorkspace(input: {
  resolved: ResolvedBubble;
  artifacts: DeleteBubbleArtifacts;
  execution: DeleteExecutionContext;
  dependencies: ResolvedDeleteDependencies;
  toDeleteStepError: (input: {
    bubbleId: string;
    bubbleInstanceId: string;
    step: "worktree-cleanup" | "remove-active";
    error: unknown;
  }) => Error;
}): Promise<DeleteWorkspaceCleanupResult> {
  let removedWorktree = false;
  let removedBubbleBranch = false;

  if (input.artifacts.worktree.exists || input.artifacts.branch.exists) {
    try {
      const cleanupResult = await input.dependencies.cleanupWorktreeWorkspace({
        repoPath: input.resolved.repoPath,
        bubbleBranch: input.resolved.bubbleConfig.bubble_branch,
        worktreePath: input.resolved.bubblePaths.worktreePath
      });
      removedWorktree = cleanupResult.removedWorktree;
      removedBubbleBranch = cleanupResult.removedBranch;
    } catch (error) {
      throw input.toDeleteStepError({
        bubbleId: input.resolved.bubbleId,
        bubbleInstanceId: input.execution.bubbleInstanceId,
        step: "worktree-cleanup",
        error
      });
    }
  }

  try {
    await input.dependencies.removeBubbleDirectory(input.resolved.bubblePaths.bubbleDir);
  } catch (error) {
    throw input.toDeleteStepError({
      bubbleId: input.resolved.bubbleId,
      bubbleInstanceId: input.execution.bubbleInstanceId,
      step: "remove-active",
      error
    });
  }

  return { removedWorktree, removedBubbleBranch };
}

export async function emitDeleteLifecycleEvent(input: {
  resolved: ResolvedBubble;
  artifacts: DeleteBubbleArtifacts;
  execution: DeleteExecutionContext;
  runtimeCleanup: DeleteRuntimeCleanupResult;
  workspaceCleanup: DeleteWorkspaceCleanupResult;
  force: boolean;
  now: Date;
}): Promise<void> {
  await emitBubbleLifecycleEventBestEffort({
    repoPath: input.resolved.repoPath,
    bubbleId: input.resolved.bubbleId,
    bubbleInstanceId: input.execution.bubbleInstanceId,
    eventType: "bubble_deleted",
    round: input.execution.metricsRound,
    actorRole: "orchestrator",
    metadata: {
      force: input.force,
      tmux_session_terminated: input.runtimeCleanup.tmuxSessionTerminated,
      runtime_session_removed: input.runtimeCleanup.runtimeSessionRemoved,
      removed_worktree: input.workspaceCleanup.removedWorktree,
      removed_bubble_branch: input.workspaceCleanup.removedBubbleBranch,
      had_worktree: input.artifacts.worktree.exists,
      had_tmux_session: input.artifacts.tmux.exists,
      had_runtime_session: input.artifacts.runtimeSession.exists,
      had_branch: input.artifacts.branch.exists
    },
    now: input.now
  });
}
