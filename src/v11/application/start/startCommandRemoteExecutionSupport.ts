import { basename } from "node:path";

import { PAIRFLOW_REMOTE_CONFIG_INVALID } from "../../../config/pairflowConfig.js";
import type {
  BubbleRemotePointerCreated
} from "../../shared/remote/remoteExecutionTypes.js";
import type {
  BubbleRemoteStateCache
} from "../../../types/bubble.js";
import type { RemoteBubbleExecutionTarget } from "./startCommandContract.js";
import type { StartExecutionContext } from "./startCommandContext.js";
import type { ResolvedStartBubbleDependencies } from "./startCommandOrchestration.js";
import { SchemaValidationError } from "../../shared/validation/primitives.js";
import { createStartBubbleError } from "./startCommandRuntime.js";

export interface RemoteBubbleStartErrorLike extends Error {
  code: string;
  details?:
    | {
        receivedState?: string | null;
        receivedRound?: number | null;
      }
    | undefined;
}

export function buildRemoteClonePath(
  repoBase: string,
  repoPath: string,
  bubbleId: string
): string {
  return `${repoBase.replace(/\/+$/u, "")}/${basename(repoPath)}--${bubbleId}`;
}

export function describeRemoteReconciliationFailure(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function isRemoteBubbleStartError(
  error: unknown
): error is RemoteBubbleStartErrorLike {
  return (
    error instanceof Error
    && error.name === "RemoteBubbleStartError"
    && typeof (error as { code?: unknown }).code === "string"
  );
}

async function loadRemoteGlobalConfigOrThrow(input: {
  context: StartExecutionContext;
  deps: ResolvedStartBubbleDependencies;
  remoteAlias: string;
}) {
  try {
    return await input.deps.loadPairflowGlobalConfig();
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
          remote: input.remoteAlias
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
        remote: input.remoteAlias
      }
    });
  }
}

export async function resolveRemoteTarget(input: {
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

  const globalConfig = await loadRemoteGlobalConfigOrThrow({
    context: input.context,
    deps: input.deps,
    remoteAlias: executor.remote
  });
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

export async function readCreatedRemotePointerOrThrow(input: {
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

export function assertCreatedPointerMatchesRemoteTarget(input: {
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

export function assertConfirmedRemoteStateIsRunning(input: {
  context: StartExecutionContext;
  remoteTarget: RemoteBubbleExecutionTarget;
  remoteClonePath: string;
  remoteState: BubbleRemoteStateCache;
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

export async function assertRemoteLocalGitPreflight(input: {
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
