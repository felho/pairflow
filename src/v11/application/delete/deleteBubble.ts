import type {
  DeleteBubbleArtifacts,
  DeleteBubbleResult
} from "../../../contracts/deleteBubble.js";
import {
  buildBubbleTmuxSessionName,
  TmuxCommandError,
  type TmuxRunner
} from "../../../core/runtime/tmuxManager.js";
import { readStateSnapshot } from "../../../core/state/stateStore.js";
import { ensureBubbleInstanceIdForMutation } from "../../../core/bubble/bubbleInstanceId.js";
import { StopBubbleErrorV11 as StopBubbleError } from "../stop/emitStopV11.js";
import { isNamedError } from "../../shared/errors/namedError.js";
import {
  buildDeleteConfirmationResult,
  buildDeleteSuccessResult,
  type DeleteBubbleDependencies,
  type DeleteBubbleInput,
  type DeleteExecutionContext,
  type DeleteResolution,
  type DeleteRuntimeCleanupResult,
  inferCreatedAtFromBubbleInstanceId,
  preDeleteStopStateByLifecycle,
  requiresDeleteConfirmation,
  resolveDeleteDependencies,
  type ResolvedBubble,
  type ResolvedDeleteDependencies
} from "./deleteBubbleSupport.js";
import {
  cleanupDeleteWorkspace,
  createDeleteArchive,
  emitDeleteLifecycleEvent
} from "./deleteBubbleFinalization.js";

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
    now,
    inferCreatedAtFromBubbleInstanceId,
    toDeleteStepError
  });
  const workspaceCleanup = await cleanupDeleteWorkspace({
    resolved,
    artifacts,
    execution,
    dependencies: resolvedDependencies,
    toDeleteStepError
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
  if (isNamedError(error, "BubbleLookupError")) {
    throw toDeleteBubbleError(error.message);
  }
  if (error instanceof TmuxCommandError) {
    throw toDeleteBubbleError(error.message);
  }
  if (error instanceof StopBubbleError) {
    throw toDeleteBubbleError(error.message);
  }
  if (
    isNamedError(error, "RuntimeSessionsRegistryError") ||
    isNamedError(error, "RuntimeSessionsRegistryLockError")
  ) {
    throw toDeleteBubbleError(error.message);
  }
  if (isNamedError(error, "WorkspaceCleanupError")) {
    throw toDeleteBubbleError(error.message);
  }
  if (error instanceof Error) {
    throw toDeleteBubbleError(error.message);
  }
  throw error;
}
