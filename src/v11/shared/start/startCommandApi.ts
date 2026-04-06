import { emitBubbleLifecycleEventBestEffort } from "../../../v11/shared/metrics/bubbleEvents.js";
import type {
  StartBubbleDependencies,
  StartBubbleInput,
  StartBubbleResult
} from "../../application/start/startCommandContract.js";
import {
  mapStartBubbleResult,
  resolveStartBubbleDependencies
} from "./startCommandOrchestration.js";
import { StartBubbleError, throwAsStartBubbleError } from "./startCommandRuntime.js";
import {
  cleanupFailedStart,
  runFreshStartFlow,
  runResumeStartFlow,
  type FreshStartProgress
} from "./startCommandFlows.js";
import { isTmuxSessionAliveDefault, runWorktreeBootstrapCommandDefault } from "./startCommandDefaults.js";
import {
  loadStartExecutionContext,
  type StartExecutionContext
} from "./startCommandContext.js";
import { claimRuntimeSessionOwnership } from "./startCommandSession.js";

export type {
  StartBubbleDependencies,
  StartBubbleInput,
  StartBubbleResult
} from "../../application/start/startCommandContract.js";
export { StartBubbleError };

export async function startBubble(
  input: StartBubbleInput,
  dependencies: StartBubbleDependencies = {}
): Promise<StartBubbleResult> {
  const deps = resolveStartBubbleDependencies({
    dependencies,
    runWorktreeBootstrapCommandDefault,
    isTmuxSessionAliveDefault
  });

  let context: StartExecutionContext;
  try {
    context = await loadStartExecutionContext(input);
  } catch (error) {
    if (error instanceof StartBubbleError) {
      throw error;
    }
    const message = error instanceof Error ? error.message : String(error);
    throw new StartBubbleError(
      `Failed to load start execution context for bubble ${input.bubbleId}: ${message}`
    );
  }

  let ownershipClaimed = false;
  try {
    await claimRuntimeSessionOwnership({
      context,
      deps
    });
    ownershipClaimed = true;
  } catch (error) {
    if (error instanceof StartBubbleError) {
      throw error;
    }
    const message = error instanceof Error ? error.message : String(error);
    throw new StartBubbleError(
      `Failed to acquire runtime session ownership for bubble ${context.resolved.bubbleId}: ${message}`
    );
  }

  let tmuxSessionName: string | null = null;
  const freshProgress: FreshStartProgress = {
    workspaceBootstrapped: false,
    preparingState: null
  };

  try {
    const startResult = context.startMode === "fresh"
      ? await runFreshStartFlow({
          context,
          deps,
          progress: freshProgress
        })
      : await runResumeStartFlow({
          context,
          deps
        });

    tmuxSessionName = startResult.tmuxSessionName;
    const resolvedTmuxSessionName = tmuxSessionName ?? context.expectedTmuxSessionName;

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
        worktree_path: context.resolved.bubblePaths.worktreePath
      },
      now: context.now
    });

    return mapStartBubbleResult({
      bubbleId: context.resolved.bubbleId,
      state: startResult.written.state,
      tmuxSessionName: resolvedTmuxSessionName,
      worktreePath: context.resolved.bubblePaths.worktreePath
    });
  } catch (error) {
    await cleanupFailedStart({
      context,
      deps,
      ownershipClaimed,
      workspaceBootstrapped: freshProgress.workspaceBootstrapped,
      tmuxSessionName,
      preparingState: freshProgress.preparingState
    });
    if (error instanceof StartBubbleError) {
      throw error;
    }
    const message = error instanceof Error ? error.message : String(error);
    throw new StartBubbleError(`Failed to start bubble ${context.resolved.bubbleId}: ${message}`);
  }
}

export function asStartBubbleError(error: unknown): never {
  return throwAsStartBubbleError(error);
}
