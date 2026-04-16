import { emitBubbleLifecycleEventBestEffort } from "../../shared/metrics/bubbleEvents.js";
import type {
  StartBubbleDependencies,
  StartBubbleInput,
  StartBubbleResult
} from "./startCommandContract.js";
import {
  mapStartBubbleResult,
  resolveStartBubbleDependencies
} from "./startCommandOrchestration.js";
import {
  buildStartupIncompleteStartFailureMessage,
  StartBubbleError,
  throwAsStartBubbleError
} from "./startCommandRuntime.js";
import {
  cleanupFailedStart,
  runFreshStartFlow,
  runResumeStartFlow,
  type FreshStartProgress
} from "./startCommandFlows.js";
import { isTmuxSessionAliveDefault, runWorktreeBootstrapCommandDefault } from "./startCommandDefaults.js";
import {
  loadStartExecutionContext,
  type ResolvedStartBubble,
  type StartExecutionContext
} from "./startCommandContext.js";
import { claimRuntimeSessionOwnership } from "./startCommandSession.js";
import { startCommandContextDefaults } from "./startCommandDependencyDefaults.js";

export type {
  StartBubbleDependencies,
  StartBubbleInput,
  StartBubbleResult
} from "./startCommandContract.js";
export { StartBubbleError };

function resolveStartBubbleLookupInput(input: StartBubbleInput): {
  bubbleId: string;
  repoPath?: string;
  cwd?: string;
} {
  return {
    bubbleId: input.bubbleId,
    ...(input.repoPath !== undefined ? { repoPath: input.repoPath } : {}),
    ...(input.cwd !== undefined ? { cwd: input.cwd } : {})
  };
}

async function loadExecutionContextOrThrow(
  input: StartBubbleInput,
  deps: Pick<
    Awaited<ReturnType<typeof resolveStartBubbleDependencies>>,
    "readReviewerBriefArtifact" | "readReviewerFocusArtifact" | "readRemotePointer"
  >,
  resolved?: ResolvedStartBubble
): Promise<StartExecutionContext> {
  try {
    return await loadStartExecutionContext(input, {
      readReviewerBriefArtifact:
        deps.readReviewerBriefArtifact,
      readReviewerFocusArtifact:
        deps.readReviewerFocusArtifact,
      readRemotePointer:
        deps.readRemotePointer
    }, {
      ...(resolved !== undefined ? { resolved } : {})
    });
  } catch (error) {
    if (error instanceof StartBubbleError) {
      throw error;
    }
    const message = error instanceof Error ? error.message : String(error);
    throw new StartBubbleError(
      `Failed to load start execution context for bubble ${input.bubbleId}: ${message}`
    );
  }
}

async function claimRuntimeSessionOwnershipOrThrow(input: {
  context: StartExecutionContext;
  deps: Awaited<ReturnType<typeof resolveStartBubbleDependencies>>;
}): Promise<void> {
  try {
    input.context.runtimeSessionRecord = await claimRuntimeSessionOwnership({
      context: input.context,
      deps: input.deps
    });
  } catch (error) {
    if (error instanceof StartBubbleError) {
      throw error;
    }
    const message = error instanceof Error ? error.message : String(error);
    throw new StartBubbleError(
      `Failed to acquire runtime session ownership for bubble ${input.context.resolved.bubbleId}: ${message}`
    );
  }
}

async function resolveStartBubblePreflightOrThrow(
  input: StartBubbleInput
): Promise<ResolvedStartBubble> {
  try {
    return await startCommandContextDefaults.resolveBubbleById(
      resolveStartBubbleLookupInput(input)
    );
  } catch (error) {
    throwAsStartBubbleError(error);
  }
}

async function runStartFlow(input: {
  context: StartExecutionContext;
  deps: Awaited<ReturnType<typeof resolveStartBubbleDependencies>>;
  freshProgress: FreshStartProgress;
}): Promise<{
  startResult: Awaited<ReturnType<typeof runFreshStartFlow>>;
  resolvedTmuxSessionName: string;
  executionTarget: "local" | "remote";
  runtimeWorkspacePath: string;
}> {
  const startResult = input.context.startMode === "fresh"
    ? await runFreshStartFlow({
        context: input.context,
        deps: input.deps,
        progress: input.freshProgress
      })
    : await runResumeStartFlow({
        context: input.context,
        deps: input.deps
      });

  const resolvedTmuxSessionName =
    startResult.tmuxSessionName ?? input.context.expectedTmuxSessionName;

  return {
    startResult,
    resolvedTmuxSessionName,
    executionTarget: startResult.executionTarget,
    runtimeWorkspacePath: startResult.runtimeWorkspacePath
  };
}

function toStartupIncompleteError(input: {
  bubbleId: string;
  message: string;
  error: unknown;
}): StartBubbleError {
  if (input.error instanceof StartBubbleError) {
    return new StartBubbleError({
      message: buildStartupIncompleteStartFailureMessage(
        input.bubbleId,
        input.message
      ),
      ...(input.error.reasonCode !== undefined
        ? { reasonCode: input.error.reasonCode }
        : {}),
      ...(input.error.context !== undefined
        ? { context: input.error.context }
        : {}),
      cause: input.error
    });
  }

  return new StartBubbleError(
    buildStartupIncompleteStartFailureMessage(
      input.bubbleId,
      input.message
    )
  );
}

function throwStartFailure(input: {
  context: StartExecutionContext;
  freshProgress: FreshStartProgress;
  error: unknown;
}): never {
  const message = input.error instanceof Error ? input.error.message : String(input.error);
  if (input.context.startMode === "fresh" && input.freshProgress.preparingState !== null) {
    throw toStartupIncompleteError({
      bubbleId: input.context.resolved.bubbleId,
      message,
      error: input.error
    });
  }
  if (input.error instanceof StartBubbleError) {
    const reasonCode = input.error.reasonCode ?? "START_BUBBLE_ERROR";
    const context = input.error.context ?? {
      command_name: "start",
      bubble_id: input.context.resolved.bubbleId,
      start_mode: input.context.startMode
    };
    throw new StartBubbleError({
      reasonCode,
      message: input.error.message,
      context,
      cause: input.error
    });
  }
  throw new StartBubbleError(
    `Failed to start bubble ${input.context.resolved.bubbleId}: ${message}`
  );
}

export async function startBubble(
  input: StartBubbleInput,
  dependencies: StartBubbleDependencies = {}
): Promise<StartBubbleResult> {
  const resolved = await resolveStartBubblePreflightOrThrow(input);
  const deps = await resolveStartBubbleDependencies({
    dependencies,
    runWorktreeBootstrapCommandDefault,
    isTmuxSessionAliveDefault
  });
  const context = await loadExecutionContextOrThrow(input, deps, resolved);
  const bypassRuntimeSessionClaim =
    context.remoteStartContext !== undefined
    || (
      context.startMode === "fresh"
      && context.resolved.bubbleConfig.executor?.type === "ssh"
    );
  if (!bypassRuntimeSessionClaim) {
    await claimRuntimeSessionOwnershipOrThrow({
      context,
      deps
    });
  }

  let tmuxSessionName: string | null = null;
  const freshProgress: FreshStartProgress = {
    workspaceBootstrapped: false,
    preparingState: null,
    preparingFingerprint: null
  };

  try {
    const {
      startResult,
      resolvedTmuxSessionName,
      executionTarget,
      runtimeWorkspacePath
    } = await runStartFlow({
      context,
      deps,
      freshProgress
    });
    tmuxSessionName = startResult.tmuxSessionName;

    await emitBubbleLifecycleEventBestEffort({
      repoPath: context.resolved.repoPath,
      bubbleId: context.resolved.bubbleId,
      bubbleInstanceId: context.bubbleIdentity.bubbleInstanceId,
      eventType: "bubble_started",
      round: startResult.written.state.round > 0 ? startResult.written.state.round : null,
      actorRole: "orchestrator",
      metadata: {
        start_mode: context.startMode,
        state: startResult.written.state.state,
        tmux_session_name: resolvedTmuxSessionName,
        worktree_path: context.resolved.bubblePaths.worktreePath,
        execution_target: executionTarget,
        runtime_workspace_path: runtimeWorkspacePath
      },
      now: context.now
    });

    return mapStartBubbleResult({
      bubbleId: context.resolved.bubbleId,
      state: startResult.written.state,
      tmuxSessionName: resolvedTmuxSessionName,
      worktreePath: context.resolved.bubblePaths.worktreePath,
      executionTarget,
      runtimeWorkspacePath
    });
  } catch (error) {
    await cleanupFailedStart({
      context,
      deps,
      ownershipClaimed: !bypassRuntimeSessionClaim,
      workspaceBootstrapped: freshProgress.workspaceBootstrapped,
      tmuxSessionName,
      preparingState: freshProgress.preparingState
    });
    throwStartFailure({
      context,
      freshProgress,
      error
    });
  }
}

export function asStartBubbleError(error: unknown): never {
  return throwAsStartBubbleError(error);
}
