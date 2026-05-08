import {
  executeStartPreparingMutation,
  executeStartRunningMutation
} from "./startStatePersistence.js";
import type { BubbleStateSnapshot } from "../../shared/state/bubbleStateSnapshotTypes.js";
import type { StartExecutionContext } from "./startCommandContext.js";
import type { RemoteCloneStartContext } from "./startCommandRemoteExecutionContext.js";
import type { ResolvedStartBubbleDependencies } from "./startCommandOrchestration.js";
import { createStartBubbleError } from "./startCommandRuntime.js";
import {
  executeRemoteBubbleStartWithMappedErrors,
  prepareRemoteStartExecution,
  reconcileRemoteStartExecution,
  type StartCommandResultLike
} from "./startCommandRemoteExecutionFlow.js";

export {
  remoteCloneExternalPairflowCommandEnvVar,
  remoteCloneStartModeEnvVar,
  remoteCloneStartModeValue,
  remoteCloneWorkspaceRootEnvVar,
  resolveRemoteCloneStartContextFromEnv
} from "./startCommandRemoteExecutionContext.js";
export type {
  RemoteCloneStartContext
} from "./startCommandRemoteExecutionContext.js";

interface FreshStartProgress {
  workspaceBootstrapped: boolean;
  preparingState: BubbleStateSnapshot | null;
  preparingFingerprint: string | null;
}

export function assertRemoteCloneStartContext(input: {
  context: StartExecutionContext;
}): RemoteCloneStartContext {
  const remoteContext = input.context.remoteStartContext;
  if (remoteContext === undefined || remoteContext.kind !== "remote_clone") {
    throw createStartBubbleError({
      reasonCode: "START_REMOTE_EXECUTION_CONTEXT_INVALID",
      message:
        `Bubble ${input.context.resolved.bubbleId} remote inner start requires explicit remote clone execution context.`,
      context: {
        bubble_id: input.context.resolved.bubbleId
      }
    });
  }

  if (remoteContext.workspaceRoot !== input.context.resolved.repoPath) {
    throw createStartBubbleError({
      reasonCode: "START_REMOTE_EXECUTION_CONTEXT_INVALID",
      message:
        `Bubble ${input.context.resolved.bubbleId} remote clone workspace authority does not match the resolved repository path.`,
      context: {
        bubble_id: input.context.resolved.bubbleId,
        workspace_root: remoteContext.workspaceRoot,
        resolved_repo_path: input.context.resolved.repoPath
      }
    });
  }

  return remoteContext;
}

export async function runRemoteCloneInnerStart(input: {
  context: StartExecutionContext;
  deps: ResolvedStartBubbleDependencies;
  progress: FreshStartProgress;
}): Promise<StartCommandResultLike> {
  const remoteStartContext = assertRemoteCloneStartContext({
    context: input.context
  });
  if (
    input.context.startMode !== "fresh"
    || input.context.loadedState.state.state !== "CREATED"
  ) {
    throw createStartBubbleError({
      reasonCode: "START_REMOTE_INNER_START_FRESH_ONLY",
      message:
        `Bubble ${input.context.resolved.bubbleId} remote inner start only supports fresh activation from CREATED.`,
      context: {
        bubble_id: input.context.resolved.bubbleId,
        start_mode: input.context.startMode,
        current_state: input.context.loadedState.state.state
      }
    });
  }

  const preparingWritten = await executeStartPreparingMutation({
    statePath: input.context.resolved.bubblePaths.statePath,
    loadedState: input.context.loadedState,
    nowIso: input.context.nowIso,
    writeStateSnapshot: input.deps.writeState
  });
  input.progress.preparingState = preparingWritten.state;
  input.progress.preparingFingerprint = preparingWritten.fingerprint;

  input.context.runtimeSessionRecord = await input.deps.upsertSession({
    sessionsPath: input.context.resolved.bubblePaths.sessionsPath,
    bubbleId: input.context.resolved.bubbleId,
    repoPath: input.context.resolved.repoPath,
    worktreePath: input.context.resolved.bubblePaths.worktreePath,
    workspacePath: remoteStartContext.workspaceRoot,
    workspaceKind: input.context.resolved.bubbleConfig.work_mode,
    tmuxSessionName:
      input.context.runtimeSessionRecord?.tmuxSessionName
      ?? input.context.expectedTmuxSessionName,
    now: input.context.now
  });

  const ideationPending =
    input.context.resolved.bubbleConfig.ideation?.mode === true
    && input.context.resolved.bubbleConfig.ideation.task_pending === true
    && input.context.resolved.bubbleConfig.ideation.parse_warning === undefined;

  const tmux = await import("./startCommandTmuxLaunch.js").then(({ launchFreshTmuxSession }) =>
    launchFreshTmuxSession({
      context: input.context,
      deps: input.deps,
      ideationPending,
      launchWorkspacePath: remoteStartContext.workspaceRoot
    })
  );

  const written = await executeStartRunningMutation({
    statePath: input.context.resolved.bubblePaths.statePath,
    preparingState: preparingWritten.state,
    preparingFingerprint: preparingWritten.fingerprint,
    nowIso: input.context.nowIso,
    bubbleId: input.context.resolved.bubbleId,
    implementer: input.context.resolved.bubbleConfig.agents.implementer,
    reviewer: input.context.resolved.bubbleConfig.agents.reviewer,
    watchdogTimeoutMinutes:
      input.context.resolved.bubbleConfig.watchdog_timeout_minutes,
    ideationPending,
    writeStateSnapshot: input.deps.writeState
  });

  return {
    written,
    tmuxSessionName: tmux.sessionName,
    executionTarget: "remote",
    runtimeWorkspacePath: remoteStartContext.workspaceRoot
  };
}

export async function runRemoteStartExecution(input: {
  context: StartExecutionContext;
  deps: ResolvedStartBubbleDependencies;
  progress: FreshStartProgress;
}): Promise<StartCommandResultLike> {
  const prepared = await prepareRemoteStartExecution(input);
  const remoteStartResult = await executeRemoteBubbleStartWithMappedErrors({
    context: input.context,
    deps: input.deps,
    prepared
  });

  return reconcileRemoteStartExecution({
    context: input.context,
    deps: input.deps,
    progress: input.progress,
    prepared,
    remoteStartResult
  });
}
