import type {
  DeleteBubbleArtifacts,
  DeleteBubbleResult
} from "../../../contracts/deleteBubble.js";
import { deleteBubbleDependencyDefaults } from "./deleteBubbleDependencyDefaults.js";
import { StopBubbleErrorV11 as StopBubbleError } from "../stop/emitStopV11.js";
import { isNamedError } from "../../shared/errors/namedError.js";
import {
  buildDeleteConfirmationResult,
  buildDeleteSuccessResult,
  type DeleteRouteContext,
  type DeleteBubbleDependencies,
  type DeleteBubbleInput,
  type DeleteExecutionContext,
  type DeleteResolution,
  type DeleteRuntimeCleanupResult,
  type ExecuteRemoteBubbleDeleteCommandResult,
  inferCreatedAtFromBubbleInstanceId,
  preDeleteStopStateByLifecycle,
  requiresDeleteConfirmation,
  resolveDeleteRouteContext,
  resolveDeleteDependencies,
  type ResolvedBubble,
  type ResolvedDeleteDependencies
} from "./deleteBubbleSupport.js";
import {
  cleanupDeleteWorkspace,
  createDeleteArchive,
  emitDeleteLifecycleEvent,
  removeDeleteBubbleDirectory
} from "./deleteBubbleFinalization.js";
import { maybeFinalizeRemoteDeleteMissingTargetFallback } from "./deleteBubbleRemoteMissingTargetFallback.js";

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

type TmuxRunner = typeof deleteBubbleDependencyDefaults.runTmux;

function toDeleteBubbleError(message: string): DeleteBubbleError {
  return new DeleteBubbleError(message);
}

function toDeleteStepError(input: {
  bubbleId: string;
  bubbleInstanceId: string;
  step:
    | "snapshot"
    | "index"
    | "worktree-cleanup"
    | "remove-active"
    | "remove-runtime-health";
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

async function resolveDeleteArtifacts(input: {
  resolved: ResolvedBubble;
  worktreePath: string;
  dependencies: ResolvedDeleteDependencies;
}): Promise<DeleteResolution> {
  const [worktreeExists, bubbleBranchExists, runtimeSessions] = await Promise.all([
    input.dependencies.pathExists(input.worktreePath),
    input.dependencies.branchExists(
      input.resolved.repoPath,
      input.resolved.bubbleConfig.bubble_branch
    ),
    input.dependencies.readRuntimeSessionsRegistry(input.resolved.bubblePaths.sessionsPath, {
      allowMissing: true
    })
  ]);

  const runtimeSession = runtimeSessions[input.resolved.bubbleId] ?? null;
  const tmuxSessionName =
    runtimeSession?.tmuxSessionName ??
    deleteBubbleDependencyDefaults.buildBubbleTmuxSessionName(input.resolved.bubbleId);
  const tmuxSessionExists = await isTmuxSessionAlive(
    tmuxSessionName,
    input.dependencies.runTmux
  );

  return {
    resolved: input.resolved,
    artifacts: {
      worktree: {
        exists: worktreeExists,
        path: input.worktreePath
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
        name: input.resolved.bubbleConfig.bubble_branch
      }
    }
  };
}

async function determineDeleteExecutionContext(
  resolved: ResolvedBubble,
  now: Date
): Promise<DeleteExecutionContext> {
  const bubbleIdentity =
    await deleteBubbleDependencyDefaults.ensureBubbleInstanceIdForMutation({
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
    const loadedState = await deleteBubbleDependencyDefaults.readStateSnapshot(
      resolved.bubblePaths.statePath
    );
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

function assertRemoteDeleteConfirmationResult(input: {
  remoteResult: ExecuteRemoteBubbleDeleteCommandResult;
  routeContext: Extract<DeleteRouteContext, { route: "remote" }>;
}): DeleteBubbleResult {
  const { result } = input.remoteResult;
  if (result.bubbleId !== input.routeContext.resolved.bubbleId) {
    throw toDeleteBubbleError(
      `Remote delete confirmation contract invalid for bubble ${input.routeContext.resolved.bubbleId}: remote command returned payload for bubble ${result.bubbleId}.`
    );
  }
  if (result.artifacts.worktree.path !== input.routeContext.remotePointer.remoteClonePath) {
    throw toDeleteBubbleError(
      `Remote delete confirmation contract invalid for bubble ${input.routeContext.resolved.bubbleId}: remote command returned a mismatched canonical worktree path.`
    );
  }
  if (result.deleted) {
    throw toDeleteBubbleError(
      `Remote delete confirmation contract invalid for bubble ${input.routeContext.resolved.bubbleId}: non-force remote delete must stay on the confirmation contract and must not report deleted=true, even when remote artifacts are already absent. Re-run with --force to materialize archive continuity locally.`
    );
  }
  if (!result.requiresConfirmation) {
    throw toDeleteBubbleError(
      `Remote delete confirmation contract invalid for bubble ${input.routeContext.resolved.bubbleId}: remote command omitted requiresConfirmation=true on the confirmation path.`
    );
  }
  return result;
}

async function returnDeleteSuccessWithLifecycle(input: {
  result: DeleteBubbleResult;
  resolved: ResolvedBubble;
  execution: DeleteExecutionContext;
  force: boolean;
  now: Date;
}): Promise<DeleteBubbleResult> {
  try {
    return input.result;
  } finally {
    await emitDeleteLifecycleEvent({
      resolved: input.resolved,
      artifacts: input.result.artifacts,
      execution: input.execution,
      runtimeCleanup: {
        tmuxSessionTerminated: input.result.tmuxSessionTerminated,
        runtimeSessionRemoved: input.result.runtimeSessionRemoved
      },
      workspaceCleanup: {
        removedWorktree: input.result.removedWorktree,
        removedBubbleBranch: input.result.removedBubbleBranch
      },
      force: input.force,
      now: input.now
    });
  }
}

function assertRemoteDeleteSuccessResult(input: {
  remoteResult: ExecuteRemoteBubbleDeleteCommandResult;
  routeContext: Extract<DeleteRouteContext, { route: "remote" }>;
}): ExecuteRemoteBubbleDeleteCommandResult {
  const { result, archiveCapture } = input.remoteResult;
  if (result.bubbleId !== input.routeContext.resolved.bubbleId) {
    throw toDeleteBubbleError(
      `Remote delete force path returned payload for bubble ${result.bubbleId} instead of ${input.routeContext.resolved.bubbleId}.`
    );
  }
  if (result.requiresConfirmation || !result.deleted) {
    throw toDeleteBubbleError(
      `Remote delete force path did not return a successful delete result for bubble ${input.routeContext.resolved.bubbleId}.`
    );
  }
  if (archiveCapture === undefined) {
    throw toDeleteBubbleError(
      `Remote delete for bubble ${input.routeContext.resolved.bubbleId} completed without archive continuity payload.`
    );
  }
  if (result.artifacts.worktree.path !== input.routeContext.remotePointer.remoteClonePath) {
    throw toDeleteBubbleError(
      `Remote delete returned a mismatched canonical worktree path for bubble ${input.routeContext.resolved.bubbleId}.`
    );
  }

  if (result.artifacts.worktree.exists && !result.removedWorktree) {
    throw toDeleteBubbleError(
      `Remote delete for bubble ${input.routeContext.resolved.bubbleId} did not prove destructive cleanup of the remote clone.`
    );
  }
  if (result.artifacts.tmux.exists && !result.tmuxSessionTerminated) {
    throw toDeleteBubbleError(
      `Remote delete for bubble ${input.routeContext.resolved.bubbleId} did not prove tmux cleanup for the remote session.`
    );
  }
  if (result.artifacts.runtimeSession.exists && !result.runtimeSessionRemoved) {
    throw toDeleteBubbleError(
      `Remote delete for bubble ${input.routeContext.resolved.bubbleId} did not prove runtime-session cleanup.`
    );
  }
  if (result.artifacts.branch.exists && !result.removedBubbleBranch) {
    throw toDeleteBubbleError(
      `Remote delete for bubble ${input.routeContext.resolved.bubbleId} did not prove remote branch cleanup.`
    );
  }
  return input.remoteResult;
}

export async function deleteBubble(
  input: DeleteBubbleInput,
  dependencies: DeleteBubbleDependencies = {}
): Promise<DeleteBubbleResult> {
  const now = input.now ?? new Date();
  const resolvedDependencies = resolveDeleteDependencies(dependencies);
  const routeContext = await resolveDeleteRouteContext({
    deleteInput: input,
    dependencies: resolvedDependencies
  });

  if (routeContext.route === "remote") {
    let remoteResult: ExecuteRemoteBubbleDeleteCommandResult;
    try {
      remoteResult = await resolvedDependencies.executeRemoteBubbleDeleteCommand({
        bubbleId: routeContext.resolved.bubbleId,
        remoteClonePath: routeContext.remotePointer.remoteClonePath,
        remoteTarget: routeContext.remoteTarget,
        force: input.force === true
      });
    } catch (error) {
      const fallbackResult = await maybeFinalizeRemoteDeleteMissingTargetFallback({
        deleteInput: input,
        routeContext,
        dependencies: resolvedDependencies,
        now,
        remoteDeleteError: error,
        determineDeleteExecutionContext,
        returnDeleteSuccessWithLifecycle,
        toDeleteStepError,
        inferCreatedAtFromBubbleInstanceId
      });
      if (fallbackResult !== undefined) {
        return fallbackResult;
      }
      throw error;
    }

    if (input.force !== true) {
      return assertRemoteDeleteConfirmationResult({
        remoteResult,
        routeContext
      });
    }

    const successfulRemoteResult = assertRemoteDeleteSuccessResult({
      remoteResult,
      routeContext
    });
    const execution = await determineDeleteExecutionContext(routeContext.resolved, now);
    await createDeleteArchive({
      input,
      resolved: routeContext.resolved,
      execution,
      dependencies: resolvedDependencies,
      remoteArchiveCapture: successfulRemoteResult.archiveCapture,
      now,
      inferCreatedAtFromBubbleInstanceId,
      toDeleteStepError
    });
    await removeDeleteBubbleDirectory({
      resolved: routeContext.resolved,
      execution,
      dependencies: resolvedDependencies,
      toDeleteStepError
    });
    return returnDeleteSuccessWithLifecycle({
      result: successfulRemoteResult.result,
      resolved: routeContext.resolved,
      execution,
      force: input.force === true,
      now
    });
  }

  const { resolved, artifacts } = await resolveDeleteArtifacts({
    resolved: routeContext.resolved,
    worktreePath: routeContext.worktreePath,
    dependencies: resolvedDependencies
  });

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
    worktreePath: routeContext.worktreePath,
    dependencies: resolvedDependencies,
    toDeleteStepError
  });
  return returnDeleteSuccessWithLifecycle({
    result: buildDeleteSuccessResult({
      bubbleId: resolved.bubbleId,
      artifacts,
      runtimeCleanup,
      workspaceCleanup
    }),
    resolved,
    execution,
    force: input.force === true,
    now
  });
}

export function asDeleteBubbleError(error: unknown): never {
  if (error instanceof DeleteBubbleError) {
    throw error;
  }
  if (isNamedError(error, "BubbleLookupError")) {
    throw toDeleteBubbleError(error.message);
  }
  if (error instanceof deleteBubbleDependencyDefaults.TmuxCommandError) {
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
  if (isNamedError(error, "RemoteBubbleDeleteCommandError")) {
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
