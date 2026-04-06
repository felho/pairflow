import type {
  DeleteBubbleArtifacts,
  DeleteBubbleResult
} from "../../../contracts/deleteBubble.js";
import { BubbleLookupError } from "../../../core/bubble/bubbleLookup.js";
import { ensureBubbleInstanceIdForMutation } from "../../../core/bubble/bubbleInstanceId.js";
import { emitBubbleLifecycleEventBestEffort } from "../../../core/metrics/bubbleEvents.js";
import {
  RuntimeSessionsRegistryError,
  RuntimeSessionsRegistryLockError
} from "../../../core/runtime/sessionsRegistry.js";
import {
  buildBubbleTmuxSessionName,
  TmuxCommandError,
  type TmuxRunner
} from "../../../core/runtime/tmuxManager.js";
import { readStateSnapshot } from "../../infrastructure/state/stateStore.js";
import { WorkspaceCleanupError } from "../../../core/workspace/worktreeManager.js";
import { StopBubbleErrorV11 as StopBubbleError } from "../stop/emitStopV11.js";
import {
  buildDeleteConfirmationResult,
  buildDeleteSuccessResult,
  type DeleteBubbleDependencies,
  type DeleteBubbleInput,
  type DeleteExecutionContext,
  type DeleteResolution,
  type DeleteRuntimeCleanupResult,
  type DeleteWorkspaceCleanupResult,
  inferCreatedAtFromBubbleInstanceId,
  preDeleteStopStateByLifecycle,
  requiresDeleteConfirmation,
  resolveDeleteDependencies,
  type ResolvedBubble,
  type ResolvedDeleteDependencies
} from "./deleteBubbleSupport.js";

export type {
  DeleteBubbleArtifacts,
  DeleteBubbleResult
} from "../../../contracts/deleteBubble.js";
export type {
  DeleteBubbleDependencies,
  DeleteBubbleInput
} from "./deleteBubbleSupport.js";

export class DeleteBubbleError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "DeleteBubbleError";
  }
}

function toDeleteBubbleError(message: string): DeleteBubbleError {
  return new DeleteBubbleError(message);
}

function toDeleteStepError(input: {
  bubbleId: string;
  bubbleInstanceId: string;
  step: "snapshot" | "index" | "worktree-cleanup" | "remove-active";
  error: unknown;
}): DeleteBubbleError {
  const reason = input.error instanceof Error ? input.error.message : String(input.error);
  return toDeleteBubbleError(
    `Delete failed: bubble_id=${input.bubbleId} bubble_instance_id=${input.bubbleInstanceId} step=${input.step} reason=${reason}`
  );
}

async function isTmuxSessionAlive(
  sessionName: string,
  runner: TmuxRunner
): Promise<boolean> {
  const result = await runner(["has-session", "-t", sessionName], {
    allowFailure: true
  });
  if (result.exitCode === 0) {
    return true;
  }
  if (result.exitCode === 1) {
    return false;
  }
  const stderr = result.stderr.trim();
  const suffix = stderr.length > 0 ? `: ${stderr}` : "";
  throw toDeleteBubbleError(
    `tmux has-session failed for ${sessionName} (exit ${result.exitCode})${suffix}`
  );
}

async function resolveDeleteArtifacts(
  input: DeleteBubbleInput,
  dependencies: ResolvedDeleteDependencies
): Promise<DeleteResolution> {
  const resolved = await dependencies.resolveBubbleById({
    bubbleId: input.bubbleId,
    ...(input.repoPath !== undefined ? { repoPath: input.repoPath } : {}),
    ...(input.cwd !== undefined ? { cwd: input.cwd } : {})
  });

  const [worktreeExists, bubbleBranchExists, runtimeSessions] = await Promise.all([
    dependencies.pathExists(resolved.bubblePaths.worktreePath),
    dependencies.branchExists(
      resolved.repoPath,
      resolved.bubbleConfig.bubble_branch
    ),
    dependencies.readRuntimeSessionsRegistry(resolved.bubblePaths.sessionsPath, {
      allowMissing: true
    })
  ]);

  const runtimeSession = runtimeSessions[resolved.bubbleId] ?? null;
  const tmuxSessionName =
    runtimeSession?.tmuxSessionName ?? buildBubbleTmuxSessionName(resolved.bubbleId);
  const tmuxSessionExists = await isTmuxSessionAlive(
    tmuxSessionName,
    dependencies.runTmux
  );

  return {
    resolved,
    artifacts: {
      worktree: {
        exists: worktreeExists,
        path: resolved.bubblePaths.worktreePath
      },
      tmux: {
        exists: tmuxSessionExists,
        sessionName: tmuxSessionName
      },
      runtimeSession: {
        exists: runtimeSession !== null,
        sessionName: runtimeSession?.tmuxSessionName ?? null
      },
      branch: {
        exists: bubbleBranchExists,
        name: resolved.bubbleConfig.bubble_branch
      }
    }
  };
}

async function determineDeleteExecutionContext(
  resolved: ResolvedBubble,
  now: Date
): Promise<DeleteExecutionContext> {
  const bubbleIdentity = await ensureBubbleInstanceIdForMutation({
    bubbleId: resolved.bubbleId,
    repoPath: resolved.repoPath,
    bubblePaths: resolved.bubblePaths,
    bubbleConfig: resolved.bubbleConfig,
    now
  });
  resolved.bubbleConfig = bubbleIdentity.bubbleConfig;

  let requiresPreDeleteStop = false;
  let metricsRound: number | null = null;
  try {
    const loadedState = await readStateSnapshot(resolved.bubblePaths.statePath);
    requiresPreDeleteStop = preDeleteStopStateByLifecycle[loadedState.state.state];
    metricsRound = loadedState.state.round > 0 ? loadedState.state.round : null;
  } catch {
    requiresPreDeleteStop = false;
  }

  return {
    bubbleInstanceId: bubbleIdentity.bubbleInstanceId,
    metricsRound,
    requiresPreDeleteStop
  };
}

async function cleanupDeleteRuntimeArtifacts(input: {
  input: DeleteBubbleInput;
  resolved: ResolvedBubble;
  artifacts: DeleteBubbleArtifacts;
  execution: DeleteExecutionContext;
  dependencies: ResolvedDeleteDependencies;
}): Promise<DeleteRuntimeCleanupResult> {
  let tmuxSessionTerminated = false;
  let runtimeSessionRemoved = false;

  if (input.execution.requiresPreDeleteStop) {
    const stopResult = await input.dependencies.stopBubble({
      bubbleId: input.resolved.bubbleId,
      repoPath: input.resolved.repoPath,
      ...(input.input.cwd !== undefined ? { cwd: input.input.cwd } : {})
    });
    tmuxSessionTerminated = stopResult.tmuxSessionExisted;
    runtimeSessionRemoved = stopResult.runtimeSessionRemoved;
  } else if (input.artifacts.tmux.exists) {
    const terminated = await input.dependencies.terminateBubbleTmuxSession({
      sessionName: input.artifacts.tmux.sessionName
    });
    tmuxSessionTerminated = terminated.existed;
  }

  if (
    input.artifacts.runtimeSession.exists &&
    (!input.execution.requiresPreDeleteStop || !runtimeSessionRemoved)
  ) {
    runtimeSessionRemoved = await input.dependencies.removeRuntimeSession({
      sessionsPath: input.resolved.bubblePaths.sessionsPath,
      bubbleId: input.resolved.bubbleId
    });
  }

  return { tmuxSessionTerminated, runtimeSessionRemoved };
}

async function createDeleteArchive(input: {
  input: DeleteBubbleInput;
  resolved: ResolvedBubble;
  execution: DeleteExecutionContext;
  dependencies: ResolvedDeleteDependencies;
  now: Date;
}): Promise<void> {
  const createdAt = inferCreatedAtFromBubbleInstanceId(
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
    throw toDeleteStepError({
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
    throw toDeleteStepError({
      bubbleId: input.resolved.bubbleId,
      bubbleInstanceId: input.execution.bubbleInstanceId,
      step: "index",
      error
    });
  }
}

async function cleanupDeleteWorkspace(input: {
  resolved: ResolvedBubble;
  artifacts: DeleteBubbleArtifacts;
  execution: DeleteExecutionContext;
  dependencies: ResolvedDeleteDependencies;
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
      throw toDeleteStepError({
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
    throw toDeleteStepError({
      bubbleId: input.resolved.bubbleId,
      bubbleInstanceId: input.execution.bubbleInstanceId,
      step: "remove-active",
      error
    });
  }

  return { removedWorktree, removedBubbleBranch };
}

async function emitDeleteLifecycleEvent(input: {
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

export async function deleteBubble(
  input: DeleteBubbleInput,
  dependencies: DeleteBubbleDependencies = {}
): Promise<DeleteBubbleResult> {
  const now = input.now ?? new Date();
  const resolvedDependencies = resolveDeleteDependencies(dependencies);
  const { resolved, artifacts } = await resolveDeleteArtifacts(
    input,
    resolvedDependencies
  );

  if (requiresDeleteConfirmation(artifacts, input.force)) {
    return buildDeleteConfirmationResult(resolved.bubbleId, artifacts);
  }

  const execution = await determineDeleteExecutionContext(resolved, now);
  const runtimeCleanup = await cleanupDeleteRuntimeArtifacts({
    input,
    resolved,
    artifacts,
    execution,
    dependencies: resolvedDependencies
  });
  await createDeleteArchive({
    input,
    resolved,
    execution,
    dependencies: resolvedDependencies,
    now
  });
  const workspaceCleanup = await cleanupDeleteWorkspace({
    resolved,
    artifacts,
    execution,
    dependencies: resolvedDependencies
  });
  await emitDeleteLifecycleEvent({
    resolved,
    artifacts,
    execution,
    runtimeCleanup,
    workspaceCleanup,
    force: input.force === true,
    now
  });

  return buildDeleteSuccessResult({
    bubbleId: resolved.bubbleId,
    artifacts,
    runtimeCleanup,
    workspaceCleanup
  });
}

export function asDeleteBubbleError(error: unknown): never {
  if (error instanceof DeleteBubbleError) {
    throw error;
  }
  if (error instanceof BubbleLookupError) {
    throw toDeleteBubbleError(error.message);
  }
  if (error instanceof TmuxCommandError) {
    throw toDeleteBubbleError(error.message);
  }
  if (error instanceof StopBubbleError) {
    throw toDeleteBubbleError(error.message);
  }
  if (
    error instanceof RuntimeSessionsRegistryError ||
    error instanceof RuntimeSessionsRegistryLockError
  ) {
    throw toDeleteBubbleError(error.message);
  }
  if (error instanceof WorkspaceCleanupError) {
    throw toDeleteBubbleError(error.message);
  }
  if (error instanceof Error) {
    throw toDeleteBubbleError(error.message);
  }
  throw error;
}
