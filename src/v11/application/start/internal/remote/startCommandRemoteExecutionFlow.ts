import {
  executeStartFailedCleanupMutation,
  executeStartPreparingMutation,
  executeStartRunningMutation
} from "../runtime/startStatePersistence.js";
import type {
  BubbleRemotePointerCreated
} from "../../../../shared/remote/remoteExecutionTypes.js";
import type {
  ExecuteRemoteBubbleStartResult,
  RemoteBubbleExecutionTarget,
  RemoteStartControlFile
} from "../../startCommandContract.js";
import type { StartExecutionContext } from "../runtime/startCommandContext.js";
import type { ResolvedStartBubbleDependencies } from "../../startCommandOrchestration.js";
import { createStartBubbleError } from "../runtime/startCommandRuntime.js";
import { buildRemoteControlFiles } from "./startCommandRemoteControlFiles.js";
import {
  assertConfirmedRemoteStateIsRunning,
  assertCreatedPointerMatchesRemoteTarget,
  assertRemoteLocalGitPreflight,
  buildRemoteClonePath,
  describeRemoteReconciliationFailure,
  isRemoteBubbleStartError,
  readCreatedRemotePointerOrThrow,
  resolveRemoteTarget
} from "./startCommandRemoteExecutionSupport.js";

type StartPreparingMutationResult = Awaited<
  ReturnType<typeof executeStartPreparingMutation>
>;
type StartRunningMutationResult = Awaited<
  ReturnType<typeof executeStartRunningMutation>
>;

export interface RemoteStartProgressLike {
  preparingState: StartPreparingMutationResult["state"] | null;
  preparingFingerprint: string | null;
}

export interface StartCommandResultLike {
  written: StartRunningMutationResult;
  tmuxSessionName: string;
  executionTarget: "local" | "remote";
  runtimeWorkspacePath: string;
}

export interface PreparedRemoteStartExecution {
  remoteTarget: RemoteBubbleExecutionTarget;
  createdPointer: BubbleRemotePointerCreated;
  originUrl: string;
  remoteClonePath: string;
  controlFiles: RemoteStartControlFile[];
  preparingWritten: StartPreparingMutationResult;
}

function assertFreshRemoteStartMode(context: StartExecutionContext): void {
  if (context.startMode === "fresh") {
    return;
  }

  throw createStartBubbleError({
    reasonCode: "START_REMOTE_RESUME_UNSUPPORTED",
    message:
      `Bubble ${context.resolved.bubbleId} remote start only supports first activation from CREATED in this phase.`,
    context: {
      bubble_id: context.resolved.bubbleId,
      start_mode: context.startMode,
      current_state: context.loadedState.state.state
    }
  });
}

function buildStartedRemotePointer(input: {
  remoteTarget: RemoteBubbleExecutionTarget;
  createdPointer: BubbleRemotePointerCreated;
  remoteStartResult: ExecuteRemoteBubbleStartResult;
}) {
  return {
    kind: "started" as const,
    host: input.remoteTarget.host,
    instanceId: input.remoteStartResult.instanceId,
    remoteClonePath: input.remoteStartResult.remoteClonePath,
    tmuxSession: input.remoteStartResult.tmuxSessionName,
    startedAt: input.remoteStartResult.startedAt,
    ...(input.createdPointer.portForwards !== undefined
      ? { portForwards: input.createdPointer.portForwards }
      : {})
  };
}

function isIdeationPending(context: StartExecutionContext): boolean {
  return (
    context.resolved.bubbleConfig.ideation?.mode === true
    && context.resolved.bubbleConfig.ideation.task_pending === true
    && context.resolved.bubbleConfig.ideation.parse_warning === undefined
  );
}

async function persistConfirmedRemoteStart(input: {
  context: StartExecutionContext;
  deps: ResolvedStartBubbleDependencies;
  prepared: PreparedRemoteStartExecution;
  remoteStartResult: ExecuteRemoteBubbleStartResult;
}): Promise<StartCommandResultLike> {
  await input.deps.upsertSession({
    sessionsPath: input.context.resolved.bubblePaths.sessionsPath,
    bubbleId: input.context.resolved.bubbleId,
    repoPath: input.context.resolved.repoPath,
    worktreePath: input.context.resolved.bubblePaths.worktreePath,
    workspacePath: input.remoteStartResult.remoteClonePath,
    workspaceKind: input.context.resolved.bubbleConfig.work_mode,
    tmuxSessionName: input.remoteStartResult.tmuxSessionName,
    now: input.context.now
  });

  await input.deps.writeRemoteStateCache(
    input.context.resolved.bubblePaths.remoteStateCachePath,
    input.remoteStartResult.remoteState
  );
  await input.deps.writeRemotePointer(
    input.context.resolved.bubblePaths.remotePointerPath,
    buildStartedRemotePointer({
      remoteTarget: input.prepared.remoteTarget,
      createdPointer: input.prepared.createdPointer,
      remoteStartResult: input.remoteStartResult
    })
  );

  const written = await executeStartRunningMutation({
    statePath: input.context.resolved.bubblePaths.statePath,
    preparingState: input.prepared.preparingWritten.state,
    preparingFingerprint: input.prepared.preparingWritten.fingerprint,
    nowIso: input.context.nowIso,
    bubbleId: input.context.resolved.bubbleId,
    implementer: input.context.resolved.bubbleConfig.agents.implementer,
    reviewer: input.context.resolved.bubbleConfig.agents.reviewer,
    watchdogTimeoutMinutes:
      input.context.resolved.bubbleConfig.watchdog_timeout_minutes,
    ideationPending: isIdeationPending(input.context),
    writeStateSnapshot: input.deps.writeState
  });

  return {
    written,
    tmuxSessionName: input.remoteStartResult.tmuxSessionName,
    executionTarget: "remote",
    runtimeWorkspacePath: input.remoteStartResult.remoteClonePath
  };
}

async function rollbackRemoteReconciliation(input: {
  context: StartExecutionContext;
  deps: ResolvedStartBubbleDependencies;
  prepared: PreparedRemoteStartExecution;
  progress: RemoteStartProgressLike;
}): Promise<string[]> {
  const rollbackFailures: string[] = [];

  await input.deps.removeRemoteStateCache(
    input.context.resolved.bubblePaths.remoteStateCachePath
  ).catch((rollbackError) => {
    rollbackFailures.push(
      `remote_state_cache=${describeRemoteReconciliationFailure(rollbackError)}`
    );
  });
  await input.deps.writeRemotePointer(
    input.context.resolved.bubblePaths.remotePointerPath,
    input.prepared.createdPointer
  ).catch((rollbackError) => {
    rollbackFailures.push(
      `remote_pointer=${describeRemoteReconciliationFailure(rollbackError)}`
    );
  });
  await executeStartFailedCleanupMutation({
    statePath: input.context.resolved.bubblePaths.statePath,
    preparingState: input.prepared.preparingWritten.state,
    nowIso: input.context.nowIso,
    writeStateSnapshot: input.deps.writeState
  }).then(() => {
    input.progress.preparingState = null;
    input.progress.preparingFingerprint = null;
  }).catch((rollbackError) => {
    rollbackFailures.push(
      `state_cleanup=${describeRemoteReconciliationFailure(rollbackError)}`
    );
  });

  return rollbackFailures;
}

export async function prepareRemoteStartExecution(input: {
  context: StartExecutionContext;
  deps: ResolvedStartBubbleDependencies;
  progress: RemoteStartProgressLike;
}): Promise<PreparedRemoteStartExecution> {
  assertFreshRemoteStartMode(input.context);

  const remoteTarget = await resolveRemoteTarget(input);
  const createdPointer = await readCreatedRemotePointerOrThrow(input);
  assertCreatedPointerMatchesRemoteTarget({
    context: input.context,
    createdPointer,
    remoteTarget
  });

  const originUrl = await assertRemoteLocalGitPreflight(input);
  const remoteClonePath = buildRemoteClonePath(
    remoteTarget.repoBase,
    input.context.resolved.repoPath,
    input.context.resolved.bubbleId
  );
  const controlFiles = await buildRemoteControlFiles({
    context: input.context,
    remoteClonePath,
    resolveDocContractGateArtifactPath:
      input.deps.resolveDocContractGateArtifactPath
  });
  const preparingWritten = await executeStartPreparingMutation({
    statePath: input.context.resolved.bubblePaths.statePath,
    loadedState: input.context.loadedState,
    nowIso: input.context.nowIso,
    writeStateSnapshot: input.deps.writeState
  });
  input.progress.preparingState = preparingWritten.state;
  input.progress.preparingFingerprint = preparingWritten.fingerprint;

  return {
    remoteTarget,
    createdPointer,
    originUrl,
    remoteClonePath,
    controlFiles,
    preparingWritten
  };
}

export async function executeRemoteBubbleStartWithMappedErrors(input: {
  context: StartExecutionContext;
  deps: ResolvedStartBubbleDependencies;
  prepared: PreparedRemoteStartExecution;
}): Promise<ExecuteRemoteBubbleStartResult> {
  try {
    return await input.deps.executeRemoteBubbleStart({
      bubbleId: input.context.resolved.bubbleId,
      repoPath: input.context.resolved.repoPath,
      bubblePaths: input.context.resolved.bubblePaths,
      bubbleConfig: input.context.resolved.bubbleConfig,
      remoteTarget: input.prepared.remoteTarget,
      originUrl: input.prepared.originUrl,
      remoteClonePath: input.prepared.remoteClonePath,
      controlFiles: input.prepared.controlFiles
    });
  } catch (error) {
    if (
      isRemoteBubbleStartError(error)
      && error.code === "REMOTE_CONFIRMATION_INVALID"
    ) {
      throw createStartBubbleError({
        reasonCode: "START_REMOTE_CONFIRMATION_INVALID",
        message: error.message,
        context: {
          bubble_id: input.context.resolved.bubbleId,
          remote: input.prepared.remoteTarget.alias,
          remote_clone_path: input.prepared.remoteClonePath,
          remote_confirmed_state: error.details?.receivedState ?? null,
          remote_confirmed_round: error.details?.receivedRound ?? null
        },
        cause: error
      });
    }

    const reason = error instanceof Error ? error.message : String(error);
    throw createStartBubbleError({
      reasonCode: "START_REMOTE_EXECUTION_FAILED",
      message:
        `Remote start execution failed for bubble ${input.context.resolved.bubbleId}: ${reason}`,
      context: {
        bubble_id: input.context.resolved.bubbleId,
        remote: input.prepared.remoteTarget.alias,
        remote_clone_path: input.prepared.remoteClonePath
      },
      cause: error
    });
  }
}

export async function reconcileRemoteStartExecution(input: {
  context: StartExecutionContext;
  deps: ResolvedStartBubbleDependencies;
  progress: RemoteStartProgressLike;
  prepared: PreparedRemoteStartExecution;
  remoteStartResult: ExecuteRemoteBubbleStartResult;
}): Promise<StartCommandResultLike> {
  for (const warning of input.remoteStartResult.warnings ?? []) {
    input.deps.reportWarning(warning);
  }
  assertConfirmedRemoteStateIsRunning({
    context: input.context,
    remoteTarget: input.prepared.remoteTarget,
    remoteClonePath: input.prepared.remoteClonePath,
    remoteState: input.remoteStartResult.remoteState
  });

  try {
    return await persistConfirmedRemoteStart(input);
  } catch (error) {
    const reconciliationReason = describeRemoteReconciliationFailure(error);
    const rollbackFailures = await rollbackRemoteReconciliation(input);

    if (rollbackFailures.length > 0) {
      throw createStartBubbleError({
        reasonCode: "START_REMOTE_RECONCILIATION_ROLLBACK_FAILED",
        message:
          `Remote start confirmed for bubble ${input.context.resolved.bubbleId}, `
          + `but local reconciliation failed (${reconciliationReason}) and rollback also failed `
          + `(${rollbackFailures.join("; ")}).`,
        context: {
          bubble_id: input.context.resolved.bubbleId,
          remote: input.prepared.remoteTarget.alias,
          remote_clone_path: input.prepared.remoteClonePath,
          reconciliation_error: reconciliationReason,
          rollback_failures: rollbackFailures
        },
        cause: error
      });
    }

    throw createStartBubbleError({
      reasonCode: "START_REMOTE_RECONCILIATION_FAILED",
      message:
        `Remote start confirmed for bubble ${input.context.resolved.bubbleId}, `
        + `but local reconciliation failed: ${reconciliationReason}`,
      context: {
        bubble_id: input.context.resolved.bubbleId,
        remote: input.prepared.remoteTarget.alias,
        remote_clone_path: input.prepared.remoteClonePath,
        reconciliation_error: reconciliationReason,
        rollback_outcome: "applied"
      },
      cause: error
    });
  }
}
