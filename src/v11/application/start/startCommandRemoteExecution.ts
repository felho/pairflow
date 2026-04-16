import { readFile } from "node:fs/promises";
import { basename } from "node:path";

import { renderBubbleConfigToml } from "../../../config/bubbleConfig.js";
import { PAIRFLOW_REMOTE_CONFIG_INVALID } from "../../../config/pairflowConfig.js";
import {
  remoteStartModeEnvVar,
  remoteStartModeInnerRemoteActivation,
  remoteStartWorkspaceRootEnvVar
} from "../../shared/bubble/remoteStartExecutionContext.js";
import { RemoteBubbleStartError } from "../../infrastructure/executor/ssh/sshBubbleStart.js";
import { SchemaValidationError } from "../../shared/validation/primitives.js";
import { resolveDocContractGateArtifactPath } from "../../shared/gates/docContractGateArtifactDefaults.js";
import {
  executeStartFailedCleanupMutation,
  executeStartPreparingMutation,
  executeStartRunningMutation
} from "../../shared/start/startStateMutation.js";
import type { BubbleRemotePointerCreated } from "../../../types/bubble.js";
import type {
  ExecuteRemoteBubbleStartResult,
  RemoteBubbleExecutionTarget
} from "./startCommandContract.js";
import type { StartExecutionContext } from "./startCommandContext.js";
import type { ResolvedStartBubbleDependencies } from "./startCommandOrchestration.js";
import {
  StartBubbleError,
  createStartBubbleError
} from "./startCommandRuntime.js";
import type { FreshStartProgress } from "./startCommandFlows.js";

export const remoteCloneStartModeEnvVar = remoteStartModeEnvVar;
export const remoteCloneWorkspaceRootEnvVar = remoteStartWorkspaceRootEnvVar;
export const remoteCloneStartModeValue = remoteStartModeInnerRemoteActivation;

export interface RemoteCloneStartContext {
  kind: "remote_clone";
  workspaceRoot: string;
}

interface StartCommandResultLike {
  written: Awaited<ReturnType<typeof executeStartRunningMutation>>;
  tmuxSessionName: string;
  executionTarget: "local" | "remote";
  runtimeWorkspacePath: string;
}

function buildRemoteClonePath(repoBase: string, repoPath: string, bubbleId: string): string {
  return `${repoBase.replace(/\/+$/u, "")}/${basename(repoPath)}--${bubbleId}`;
}

function describeRemoteReconciliationFailure(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

async function readRequiredArtifact(path: string): Promise<string> {
  return readFile(path, "utf8");
}

async function readOptionalArtifact(path: string): Promise<string | undefined> {
  return readFile(path, "utf8").catch((error: NodeJS.ErrnoException) => {
    if (error.code === "ENOENT") {
      return undefined;
    }
    throw error;
  });
}

interface RemoteControlArtifactSpec {
  relativePath: string;
  sourcePath: string;
  artifactKind:
    | "bubble_config"
    | "state"
    | "transcript"
    | "inbox"
    | "task"
    | "reviewer_focus"
    | "reviewer_policy_snapshot"
    | "reviewer_brief"
    | "doc_contract_gates";
  required: boolean;
}

async function readRemoteControlArtifact(input: {
  context: StartExecutionContext;
  remoteClonePath: string;
  artifact: RemoteControlArtifactSpec;
}): Promise<string | undefined> {
  try {
    const content =
      input.artifact.required
        ? await readRequiredArtifact(input.artifact.sourcePath)
        : await readOptionalArtifact(input.artifact.sourcePath);
    if (content === undefined && input.artifact.required) {
      throw new Error("required remote control artifact resolved to undefined");
    }
    return content;
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw createStartBubbleError({
      reasonCode: "START_REMOTE_CONTROL_FILES_UNAVAILABLE",
      message:
        `Bubble ${input.context.resolved.bubbleId} remote start could not read `
        + `${input.artifact.required ? "required" : "optional"} local control artifact `
        + `${input.artifact.relativePath}: ${reason}`,
      context: {
        bubble_id: input.context.resolved.bubbleId,
        repo_path: input.context.resolved.repoPath,
        remote_clone_path: input.remoteClonePath,
        artifact_relative_path: input.artifact.relativePath,
        artifact_source_path: input.artifact.sourcePath,
        artifact_kind: input.artifact.artifactKind,
        artifact_requirement: input.artifact.required ? "required" : "optional"
      },
      cause: error
    });
  }
}

async function resolveRemoteTarget(input: {
  context: StartExecutionContext;
  deps: ResolvedStartBubbleDependencies;
}): Promise<RemoteBubbleExecutionTarget> {
  const executor = input.context.resolved.bubbleConfig.executor;
  if (executor?.type !== "ssh") {
    throw createStartBubbleError({
      reasonCode: "START_REMOTE_EXECUTOR_INVALID",
      message:
        `Bubble ${input.context.resolved.bubbleId} is not configured for remote SSH start.`,
      context: {
        bubble_id: input.context.resolved.bubbleId,
        executor_type: executor?.type ?? null
      }
    });
  }

  let globalConfig;
  try {
    globalConfig = await input.deps.loadPairflowGlobalConfig();
  } catch (error) {
    if (error instanceof SchemaValidationError) {
      const message = error.message.startsWith(`${PAIRFLOW_REMOTE_CONFIG_INVALID}:`)
        ? error.message
        : `${PAIRFLOW_REMOTE_CONFIG_INVALID}: ${error.message}`;
      throw createStartBubbleError({
        reasonCode: "START_REMOTE_CONFIG_INVALID",
        message,
        context: {
          bubble_id: input.context.resolved.bubbleId,
          remote: executor.remote
        }
      });
    }
    const reason = error instanceof Error ? error.message : String(error);
    throw createStartBubbleError({
      reasonCode: "START_REMOTE_CONFIG_UNAVAILABLE",
      message:
        `Failed to load global Pairflow config for remote start: ${reason}`,
      context: {
        bubble_id: input.context.resolved.bubbleId,
        remote: executor.remote
      }
    });
  }

  const remoteConfig = globalConfig.remotes?.[executor.remote];
  if (remoteConfig === undefined) {
    throw createStartBubbleError({
      reasonCode: "START_REMOTE_CONFIG_INVALID",
      message:
        `${PAIRFLOW_REMOTE_CONFIG_INVALID}: Remote "${executor.remote}" is not defined in the global [remotes.<name>] config.`,
      context: {
        bubble_id: input.context.resolved.bubbleId,
        remote: executor.remote
      }
    });
  }

  return {
    alias: executor.remote,
    host: remoteConfig.host,
    ...(remoteConfig.user !== undefined ? { user: remoteConfig.user } : {}),
    repoBase: remoteConfig.repo_base,
    pairflowCommand: remoteConfig.pairflow_command ?? "pairflow",
    ...(remoteConfig.pairflow_sync_command !== undefined
      ? { pairflowSyncCommand: remoteConfig.pairflow_sync_command }
      : {}),
    ...(remoteConfig.default_port_forwards !== undefined
      ? { portForwards: remoteConfig.default_port_forwards }
      : {})
  };
}

async function readCreatedRemotePointerOrThrow(input: {
  context: StartExecutionContext;
  deps: ResolvedStartBubbleDependencies;
}): Promise<BubbleRemotePointerCreated> {
  const pointer = await input.deps.readRemotePointer(
    input.context.resolved.bubblePaths.remotePointerPath
  );
  if (pointer === null) {
    throw createStartBubbleError({
      reasonCode: "START_REMOTE_POINTER_MISSING",
      message:
        `Bubble ${input.context.resolved.bubbleId} remote start requires a created remote pointer.`,
      context: {
        bubble_id: input.context.resolved.bubbleId,
        remote_pointer_path: input.context.resolved.bubblePaths.remotePointerPath
      }
    });
  }
  if (pointer.kind !== "created") {
    throw createStartBubbleError({
      reasonCode: "START_REMOTE_POINTER_INVALID",
      message:
        `Bubble ${input.context.resolved.bubbleId} remote start only supports created remote pointers in this phase.`,
      context: {
        bubble_id: input.context.resolved.bubbleId,
        remote_pointer_kind: pointer.kind
      }
    });
  }
  return pointer;
}

function assertCreatedPointerMatchesRemoteTarget(input: {
  context: StartExecutionContext;
  createdPointer: BubbleRemotePointerCreated;
  remoteTarget: RemoteBubbleExecutionTarget;
}): void {
  if (input.createdPointer.host === input.remoteTarget.host) {
    return;
  }

  throw createStartBubbleError({
    reasonCode: "START_REMOTE_POINTER_INVALID",
    message:
      `Bubble ${input.context.resolved.bubbleId} remote start refused to continue because the created remote pointer host `
      + `(${input.createdPointer.host}) no longer matches the configured execution host (${input.remoteTarget.host}).`,
    context: {
      bubble_id: input.context.resolved.bubbleId,
      remote_alias: input.remoteTarget.alias,
      created_pointer_host: input.createdPointer.host,
      configured_execution_host: input.remoteTarget.host
    }
  });
}

function assertConfirmedRemoteStateIsRunning(input: {
  context: StartExecutionContext;
  remoteTarget: RemoteBubbleExecutionTarget;
  remoteClonePath: string;
  remoteState: ExecuteRemoteBubbleStartResult["remoteState"];
}): void {
  if (input.remoteState.state === "RUNNING") {
    return;
  }

  throw createStartBubbleError({
    reasonCode: "START_REMOTE_CONFIRMATION_INVALID",
    message:
      `Remote start confirmation for bubble ${input.context.resolved.bubbleId} expected RUNNING `
      + `but received ${input.remoteState.state}.`,
    context: {
      bubble_id: input.context.resolved.bubbleId,
      remote: input.remoteTarget.alias,
      remote_clone_path: input.remoteClonePath,
      remote_confirmed_state: input.remoteState.state,
      remote_confirmed_round: input.remoteState.round
    }
  });
}

async function assertRemoteLocalGitPreflight(input: {
  context: StartExecutionContext;
  deps: ResolvedStartBubbleDependencies;
}): Promise<string> {
  const origin = await input.deps.runGitCommand(
    ["remote", "get-url", "origin"],
    {
      cwd: input.context.resolved.repoPath,
      allowFailure: true
    }
  );
  if (origin.exitCode !== 0 || origin.stdout.trim().length === 0) {
    throw createStartBubbleError({
      reasonCode: "START_REMOTE_PREFLIGHT_FAILED",
      message:
        `Bubble ${input.context.resolved.bubbleId} remote start requires a configured git origin remote.`,
      context: {
        bubble_id: input.context.resolved.bubbleId,
        repo_path: input.context.resolved.repoPath,
        stage: "origin"
      }
    });
  }

  const status = await input.deps.runGitCommand(
    ["status", "--porcelain", "--untracked-files=no"],
    {
      cwd: input.context.resolved.repoPath,
      allowFailure: true
    }
  );
  if (status.exitCode !== 0) {
    throw createStartBubbleError({
      reasonCode: "START_REMOTE_PREFLIGHT_FAILED",
      message:
        `Bubble ${input.context.resolved.bubbleId} remote start could not verify repository cleanliness.`,
      context: {
        bubble_id: input.context.resolved.bubbleId,
        repo_path: input.context.resolved.repoPath,
        stage: "status"
      }
    });
  }
  if (status.stdout.trim().length > 0) {
    throw createStartBubbleError({
      reasonCode: "START_REMOTE_PREFLIGHT_FAILED",
      message:
        `Bubble ${input.context.resolved.bubbleId} remote start requires a clean repository state before remote activation.`,
      context: {
        bubble_id: input.context.resolved.bubbleId,
        repo_path: input.context.resolved.repoPath,
        stage: "cleanliness"
      }
    });
  }

  return origin.stdout.trim();
}

async function buildRemoteControlFiles(input: {
  context: StartExecutionContext;
  remoteClonePath: string;
}): Promise<Array<{ relativePath: string; content: string }>> {
  try {
    const remoteBubbleToml = renderBubbleConfigToml({
      ...input.context.resolved.bubbleConfig,
      repo_path: input.remoteClonePath
    });

    const requiredArtifacts: RemoteControlArtifactSpec[] = [
      {
        relativePath: `.pairflow/bubbles/${input.context.resolved.bubbleId}/state.json`,
        sourcePath: input.context.resolved.bubblePaths.statePath,
        artifactKind: "state",
        required: true
      },
      {
        relativePath: `.pairflow/bubbles/${input.context.resolved.bubbleId}/transcript.ndjson`,
        sourcePath: input.context.resolved.bubblePaths.transcriptPath,
        artifactKind: "transcript",
        required: true
      },
      {
        relativePath: `.pairflow/bubbles/${input.context.resolved.bubbleId}/inbox.ndjson`,
        sourcePath: input.context.resolved.bubblePaths.inboxPath,
        artifactKind: "inbox",
        required: true
      },
      {
        relativePath: `.pairflow/bubbles/${input.context.resolved.bubbleId}/artifacts/task.md`,
        sourcePath: input.context.resolved.bubblePaths.taskArtifactPath,
        artifactKind: "task",
        required: true
      }
    ];

    const requiredFiles = [
      {
        relativePath: `.pairflow/bubbles/${input.context.resolved.bubbleId}/bubble.toml`,
        content: `${remoteBubbleToml}\n`
      },
      ...await Promise.all(requiredArtifacts.map(async (artifact) => ({
        relativePath: artifact.relativePath,
        content: await readRemoteControlArtifact({
          context: input.context,
          remoteClonePath: input.remoteClonePath,
          artifact
        }) as string
      })))
    ];

    const optionalArtifacts: RemoteControlArtifactSpec[] = [
      {
        relativePath: `.pairflow/bubbles/${input.context.resolved.bubbleId}/artifacts/reviewer-focus.json`,
        sourcePath: input.context.resolved.bubblePaths.reviewerFocusArtifactPath,
        artifactKind: "reviewer_focus",
        required: false
      },
      {
        relativePath: `.pairflow/bubbles/${input.context.resolved.bubbleId}/artifacts/reviewer-policy-snapshot.md`,
        sourcePath: input.context.policySnapshotPathAbs,
        artifactKind: "reviewer_policy_snapshot",
        required: false
      },
      {
        relativePath: `.pairflow/bubbles/${input.context.resolved.bubbleId}/artifacts/reviewer-brief.md`,
        sourcePath: input.context.resolved.bubblePaths.reviewerBriefArtifactPath,
        artifactKind: "reviewer_brief",
        required: false
      },
      {
        relativePath: `.pairflow/bubbles/${input.context.resolved.bubbleId}/artifacts/doc-contract-gates.json`,
        sourcePath: resolveDocContractGateArtifactPath(input.context.resolved.bubblePaths.artifactsDir),
        artifactKind: "doc_contract_gates",
        required: false
      }
    ];

    const optionalFiles = await Promise.all(optionalArtifacts.map(async (artifact) => {
      const content = await readRemoteControlArtifact({
        context: input.context,
        remoteClonePath: input.remoteClonePath,
        artifact
      });
      if (content === undefined) {
        return undefined;
      }
      return {
        relativePath: artifact.relativePath,
        content
      };
    }));

    return [
      ...requiredFiles,
      ...optionalFiles.filter((value): value is { relativePath: string; content: string } => value !== undefined)
    ];
  } catch (error) {
    if (error instanceof StartBubbleError) {
      throw error;
    }
    const reason = error instanceof Error ? error.message : String(error);
    throw createStartBubbleError({
      reasonCode: "START_REMOTE_CONTROL_FILES_UNAVAILABLE",
      message:
        `Bubble ${input.context.resolved.bubbleId} remote start could not read local control artifacts before remote activation: ${reason}`,
      context: {
        bubble_id: input.context.resolved.bubbleId,
        repo_path: input.context.resolved.repoPath,
        remote_clone_path: input.remoteClonePath
      },
      cause: error
    });
  }
}

export function resolveRemoteCloneStartContextFromEnv(): RemoteCloneStartContext | undefined {
  const remoteStartMode = process.env[remoteStartModeEnvVar]?.trim();
  const workspaceRoot = process.env[remoteStartWorkspaceRootEnvVar]?.trim();

  if (
    workspaceRoot !== undefined
    && workspaceRoot.length > 0
    && remoteStartMode !== remoteStartModeInnerRemoteActivation
  ) {
    throw createStartBubbleError({
      reasonCode: "START_REMOTE_EXECUTION_CONTEXT_INVALID",
      message:
        "Remote inner start workspace authority was provided without the matching remote activation mode.",
      context: {
        env_var: remoteStartWorkspaceRootEnvVar,
        mode_env_var: remoteStartModeEnvVar,
        mode_value: remoteStartMode ?? null
      }
    });
  }

  if (remoteStartMode === undefined || remoteStartMode.length === 0) {
    return undefined;
  }
  if (remoteStartMode !== remoteStartModeInnerRemoteActivation) {
    throw createStartBubbleError({
      reasonCode: "START_REMOTE_EXECUTION_CONTEXT_INVALID",
      message:
        "Remote inner start mode env var contains an unsupported activation mode.",
      context: {
        env_var: remoteStartModeEnvVar,
        mode_value: remoteStartMode
      }
    });
  }
  if (workspaceRoot === undefined || workspaceRoot.length === 0) {
    throw createStartBubbleError({
      reasonCode: "START_REMOTE_EXECUTION_CONTEXT_INVALID",
      message:
        "Remote inner start requires explicit clone-root workspace authority.",
      context: {
        env_var: remoteStartWorkspaceRootEnvVar
      }
    });
  }
  return {
    kind: "remote_clone",
    workspaceRoot
  };
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
  if (input.context.startMode !== "fresh") {
    throw createStartBubbleError({
      reasonCode: "START_REMOTE_RESUME_UNSUPPORTED",
      message:
        `Bubble ${input.context.resolved.bubbleId} remote start only supports first activation from CREATED in this phase.`,
      context: {
        bubble_id: input.context.resolved.bubbleId,
        start_mode: input.context.startMode,
        current_state: input.context.loadedState.state.state
      }
    });
  }

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
    remoteClonePath
  });

  const preparingWritten = await executeStartPreparingMutation({
    statePath: input.context.resolved.bubblePaths.statePath,
    loadedState: input.context.loadedState,
    nowIso: input.context.nowIso,
    writeStateSnapshot: input.deps.writeState
  });
  input.progress.preparingState = preparingWritten.state;
  input.progress.preparingFingerprint = preparingWritten.fingerprint;

  let remoteStartResult: ExecuteRemoteBubbleStartResult;
  try {
    remoteStartResult = await input.deps.executeRemoteBubbleStart({
      bubbleId: input.context.resolved.bubbleId,
      repoPath: input.context.resolved.repoPath,
      bubblePaths: input.context.resolved.bubblePaths,
      bubbleConfig: input.context.resolved.bubbleConfig,
      remoteTarget,
      originUrl,
      remoteClonePath,
      controlFiles
    });
  } catch (error) {
    if (
      error instanceof RemoteBubbleStartError
      && error.code === "REMOTE_CONFIRMATION_INVALID"
    ) {
      throw createStartBubbleError({
        reasonCode: "START_REMOTE_CONFIRMATION_INVALID",
        message: error.message,
        context: {
          bubble_id: input.context.resolved.bubbleId,
          remote: remoteTarget.alias,
          remote_clone_path: remoteClonePath,
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
        remote: remoteTarget.alias,
        remote_clone_path: remoteClonePath
      },
      cause: error
    });
  }

  for (const warning of remoteStartResult.warnings ?? []) {
    input.deps.reportWarning(warning);
  }
  assertConfirmedRemoteStateIsRunning({
    context: input.context,
    remoteTarget,
    remoteClonePath,
    remoteState: remoteStartResult.remoteState
  });

  const startedPointer = {
    kind: "started" as const,
    host: remoteTarget.host,
    instanceId: remoteStartResult.instanceId,
    remoteClonePath: remoteStartResult.remoteClonePath,
    tmuxSession: remoteStartResult.tmuxSessionName,
    startedAt: remoteStartResult.startedAt,
    ...(createdPointer.portForwards !== undefined
      ? { portForwards: createdPointer.portForwards }
      : {})
  };
  const ideationPending =
    input.context.resolved.bubbleConfig.ideation?.mode === true
    && input.context.resolved.bubbleConfig.ideation.task_pending === true
    && input.context.resolved.bubbleConfig.ideation.parse_warning === undefined;

  try {
    await input.deps.writeRemoteStateCache(
      input.context.resolved.bubblePaths.remoteStateCachePath,
      remoteStartResult.remoteState
    );
    await input.deps.writeRemotePointer(
      input.context.resolved.bubblePaths.remotePointerPath,
      startedPointer
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
      tmuxSessionName: remoteStartResult.tmuxSessionName,
      executionTarget: "remote",
      runtimeWorkspacePath: remoteStartResult.remoteClonePath
    };
  } catch (error) {
    const reconciliationReason = describeRemoteReconciliationFailure(error);
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
      createdPointer
    ).catch((rollbackError) => {
      rollbackFailures.push(
        `remote_pointer=${describeRemoteReconciliationFailure(rollbackError)}`
      );
    });
    await executeStartFailedCleanupMutation({
      statePath: input.context.resolved.bubblePaths.statePath,
      preparingState: preparingWritten.state,
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

    if (rollbackFailures.length > 0) {
      throw createStartBubbleError({
        reasonCode: "START_REMOTE_RECONCILIATION_ROLLBACK_FAILED",
        message:
          `Remote start confirmed for bubble ${input.context.resolved.bubbleId}, `
          + `but local reconciliation failed (${reconciliationReason}) and rollback also failed `
          + `(${rollbackFailures.join("; ")}).`,
        context: {
          bubble_id: input.context.resolved.bubbleId,
          remote: remoteTarget.alias,
          remote_clone_path: remoteClonePath,
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
        remote: remoteTarget.alias,
        remote_clone_path: remoteClonePath,
        reconciliation_error: reconciliationReason,
        rollback_outcome: "applied"
      },
      cause: error
    });
  }
}
