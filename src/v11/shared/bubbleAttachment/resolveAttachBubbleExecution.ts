import { DEFAULT_ATTACH_LAUNCHER } from "../../../config/defaults.js";
import type { PairflowGlobalConfig } from "../../../config/pairflowConfig.js";
import type {
  BubbleRemotePointer,
  BubbleRemotePointerStarted
} from "../remote/remoteExecutionTypes.js";
import type {
  AttachLauncher
} from "../../../types/bubble.js";
import type { ResolvedBubbleById } from "../../ports/bubbleLookup.js";
import { SchemaValidationError } from "../validation/primitives.js";
import { buildBubbleTmuxSessionName } from "../bubble/tmuxSessionName.js";

export interface AttachBubbleErrorContextShape {
  bubbleId?: string;
  cwd?: string;
  reason?: string;
  repoPath?: string;
  tmuxSessionName?: string;
  remoteAlias?: string;
  remoteHost?: string;
  remoteClonePath?: string;
}

interface ResolveAttachBubbleExecutionInput<
  TAttachError extends Error,
  TReasonCode extends string
> {
  request: {
    bubbleId: string;
    portForwards?: number[] | undefined;
  };
  resolved: ResolvedBubbleById;
  checkTmuxSessionExists: (sessionName: string) => Promise<boolean>;
  loadPairflowGlobalConfig: () => Promise<PairflowGlobalConfig>;
  readRemotePointer: (path: string) => Promise<BubbleRemotePointer | null>;
  buildAttachCommand: (sessionName: string) => string;
  buildRemoteAttachCommand: (input: {
    host: string;
    user?: string;
    remoteClonePath: string;
    tmuxSessionName: string;
    portForwards?: readonly number[];
  }) => string;
  createAttachError: (input: {
    message: string;
    options?: {
      context?: AttachBubbleErrorContextShape;
      reasonCode?: TReasonCode;
    };
  }) => TAttachError;
  isAttachError: (error: unknown) => error is TAttachError;
}

export interface ResolvedAttachBubbleExecution {
  launcherRequested: AttachLauncher;
  tmuxSessionName: string;
  attachCommand: string;
  diagnostics?: Array<{
    code: "REMOTE_ATTACH_CONFIG_SUPPLEMENT_UNAVAILABLE";
    message: string;
    context: AttachBubbleErrorContextShape;
  }>;
}

function resolveRequestedPortForwards(input: {
  cliPortForwards?: number[] | undefined;
  pointerPortForwards?: number[] | undefined;
}): number[] | undefined {
  return input.cliPortForwards ?? input.pointerPortForwards;
}

function validateRemoteStartedPointer<
  TAttachError extends Error,
  TReasonCode extends string
>(input: {
  bubbleId: string;
  repoPath: string;
  pointer: BubbleRemotePointerStarted;
  remoteAlias: string;
  createAttachError: (input: {
    message: string;
    options?: {
      context?: AttachBubbleErrorContextShape;
      reasonCode?: TReasonCode;
    };
  }) => TAttachError;
}): BubbleRemotePointerStarted {
  if (
    input.pointer.host.trim().length > 0 &&
    input.pointer.remoteClonePath.trim().length > 0 &&
    input.pointer.tmuxSession.trim().length > 0
  ) {
    return input.pointer;
  }

  throw input.createAttachError({
    message: `Remote attach for '${input.bubbleId}' requires a valid started pointer with remote clone path and tmux session.`,
    options: {
      context: {
        bubbleId: input.bubbleId,
        reason: "remote_pointer_invalid",
        repoPath: input.repoPath,
        remoteAlias: input.remoteAlias,
        remoteHost: input.pointer.host
      },
      reasonCode: "REMOTE_ATTACH_POINTER_INVALID" as TReasonCode
    }
  });
}

async function resolveRemoteAttachConfig(input: {
  bubbleId: string;
  repoPath: string;
  remoteAlias: string;
  expectedHost: string;
  loadGlobalConfig: () => Promise<PairflowGlobalConfig>;
}): Promise<{
  user?: string;
  diagnostics?: Array<{
    code: "REMOTE_ATTACH_CONFIG_SUPPLEMENT_UNAVAILABLE";
    message: string;
    context: AttachBubbleErrorContextShape;
  }>;
}> {
  try {
    const globalConfig = await input.loadGlobalConfig();
    const remoteConfig = globalConfig.remotes?.[input.remoteAlias];
    if (
      remoteConfig === undefined ||
      remoteConfig.host !== input.expectedHost ||
      remoteConfig.user === undefined
    ) {
      return {};
    }

    return {
      user: remoteConfig.user
    };
  } catch (error) {
    if (error instanceof SchemaValidationError) {
      return {};
    }

    if (error instanceof Error) {
      return {
        diagnostics: [
          {
            code: "REMOTE_ATTACH_CONFIG_SUPPLEMENT_UNAVAILABLE",
            message: `Failed to load global Pairflow config supplement for remote attach of '${input.bubbleId}': ${error.message}`,
            context: {
              bubbleId: input.bubbleId,
              reason: "remote_config_supplement_unavailable",
              repoPath: input.repoPath,
              remoteAlias: input.remoteAlias,
              remoteHost: input.expectedHost
            }
          }
        ]
      };
    }

    return {
      diagnostics: [
        {
          code: "REMOTE_ATTACH_CONFIG_SUPPLEMENT_UNAVAILABLE",
          message: `Failed to load global Pairflow config supplement for remote attach of '${input.bubbleId}': ${String(error)}`,
          context: {
            bubbleId: input.bubbleId,
            reason: "remote_config_supplement_unavailable",
            repoPath: input.repoPath,
            remoteAlias: input.remoteAlias,
            remoteHost: input.expectedHost
          }
        }
      ]
    };
  }
}

async function readRemotePointerOrThrow<
  TAttachError extends Error,
  TReasonCode extends string
>(input: {
  resolved: ResolvedBubbleById;
  readRemotePointer: (path: string) => Promise<BubbleRemotePointer | null>;
  createAttachError: ResolveAttachBubbleExecutionInput<TAttachError, TReasonCode>["createAttachError"];
}): Promise<BubbleRemotePointer | null> {
  try {
    return await input.readRemotePointer(
      input.resolved.bubblePaths.remotePointerPath
    );
  } catch (error) {
    if (error instanceof SchemaValidationError) {
      throw input.createAttachError({
        message:
          `Remote attach for '${input.resolved.bubbleId}' requires a valid remote pointer: ${error.message}`,
        options: {
          context: {
            bubbleId: input.resolved.bubbleId,
            reason: "remote_pointer_invalid",
            repoPath: input.resolved.repoPath
          },
          reasonCode: "REMOTE_ATTACH_POINTER_INVALID" as TReasonCode
        }
      });
    }
    throw error;
  }
}

async function resolveRequestedAttachLauncher<
  TAttachError extends Error,
  TReasonCode extends string
>(input: {
  resolved: ResolvedBubbleById;
  remotePointer: BubbleRemotePointer | null;
  loadGlobalConfigOnce: () => Promise<PairflowGlobalConfig>;
  createAttachError: ResolveAttachBubbleExecutionInput<TAttachError, TReasonCode>["createAttachError"];
}): Promise<AttachLauncher> {
  if (input.resolved.bubbleConfig.attach_launcher !== undefined) {
    return input.resolved.bubbleConfig.attach_launcher;
  }

  let globalAttachLauncher: AttachLauncher | undefined;
  try {
    globalAttachLauncher = (await input.loadGlobalConfigOnce()).attach_launcher;
  } catch (error) {
    if (error instanceof SchemaValidationError || input.remotePointer?.kind === "started") {
      globalAttachLauncher = undefined;
    } else {
      const reason = error instanceof Error ? error.message : String(error);
      throw input.createAttachError({
        message:
          `Failed to load global Pairflow config for '${input.resolved.bubbleId}': ${reason}`,
        options: {
          context: {
            bubbleId: input.resolved.bubbleId,
            reason: "load_global_config_failed",
            repoPath: input.resolved.repoPath
          },
          reasonCode: "REMOTE_ATTACH_CONFIG_INVALID" as TReasonCode
        }
      });
    }
  }

  return globalAttachLauncher ?? DEFAULT_ATTACH_LAUNCHER;
}

async function resolveLocalAttachExecution<
  TAttachError extends Error,
  TReasonCode extends string
>(input: {
  resolved: ResolvedBubbleById;
  launcherRequested: AttachLauncher;
  executor: ResolvedBubbleById["bubbleConfig"]["executor"];
  checkTmuxSessionExists: (sessionName: string) => Promise<boolean>;
  createAttachError: ResolveAttachBubbleExecutionInput<TAttachError, TReasonCode>["createAttachError"];
  buildAttachCommand: (sessionName: string) => string;
}): Promise<ResolvedAttachBubbleExecution> {
  if (input.executor?.type === "ssh") {
    throw input.createAttachError({
      message:
        `Remote bubble '${input.resolved.bubbleId}' is not started yet. Run \`pairflow bubble start --id ${input.resolved.bubbleId}\` first.`,
      options: {
        context: {
          bubbleId: input.resolved.bubbleId,
          reason: "remote_attach_start_required",
          repoPath: input.resolved.repoPath,
          remoteAlias: input.executor.remote
        },
        reasonCode: "REMOTE_ATTACH_START_REQUIRED" as TReasonCode
      }
    });
  }

  const tmuxSessionName = buildBubbleTmuxSessionName(input.resolved.bubbleId);
  const sessionExists = await input.checkTmuxSessionExists(tmuxSessionName);
  if (!sessionExists) {
    throw input.createAttachError({
      message: `Tmux session "${tmuxSessionName}" does not exist. Start the bubble runtime first.`,
      options: {
        context: {
          bubbleId: input.resolved.bubbleId,
          reason: "tmux_session_missing",
          repoPath: input.resolved.repoPath,
          tmuxSessionName
        },
        reasonCode: "TMUX_SESSION_MISSING" as TReasonCode
      }
    });
  }

  return {
    launcherRequested: input.launcherRequested,
    tmuxSessionName,
    attachCommand: input.buildAttachCommand(tmuxSessionName)
  };
}

async function resolveRemoteAttachExecution<
  TAttachError extends Error,
  TReasonCode extends string
>(input: {
  resolved: ResolvedBubbleById;
  launcherRequested: AttachLauncher;
  remotePointer: BubbleRemotePointer;
  loadGlobalConfigOnce: () => Promise<PairflowGlobalConfig>;
  requestPortForwards?: number[];
  createAttachError: ResolveAttachBubbleExecutionInput<TAttachError, TReasonCode>["createAttachError"];
  buildRemoteAttachCommand: ResolveAttachBubbleExecutionInput<TAttachError, TReasonCode>["buildRemoteAttachCommand"];
}): Promise<ResolvedAttachBubbleExecution> {
  if (input.remotePointer.kind === "created") {
    throw input.createAttachError({
      message:
        `Remote bubble '${input.resolved.bubbleId}' is not started yet. Run \`pairflow bubble start --id ${input.resolved.bubbleId}\` first.`,
      options: {
        context: {
          bubbleId: input.resolved.bubbleId,
          reason: "remote_attach_start_required",
          repoPath: input.resolved.repoPath,
          remoteHost: input.remotePointer.host
        },
        reasonCode: "REMOTE_ATTACH_START_REQUIRED" as TReasonCode
      }
    });
  }

  const executor = input.resolved.bubbleConfig.executor;
  if (executor?.type !== "ssh") {
    throw input.createAttachError({
      message: `Remote attach for '${input.resolved.bubbleId}' requires an ssh executor configuration.`,
      options: {
        context: {
          bubbleId: input.resolved.bubbleId,
          reason: "remote_executor_invalid",
          repoPath: input.resolved.repoPath
        },
        reasonCode: "REMOTE_ATTACH_CONFIG_INVALID" as TReasonCode
      }
    });
  }

  const startedPointer = validateRemoteStartedPointer({
    bubbleId: input.resolved.bubbleId,
    repoPath: input.resolved.repoPath,
    pointer: input.remotePointer,
    remoteAlias: executor.remote,
    createAttachError: input.createAttachError
  });
  const remoteConfig = await resolveRemoteAttachConfig({
    bubbleId: input.resolved.bubbleId,
    repoPath: input.resolved.repoPath,
    remoteAlias: executor.remote,
    expectedHost: startedPointer.host,
    loadGlobalConfig: input.loadGlobalConfigOnce
  });
  const tmuxSessionName = startedPointer.tmuxSession;
  const portForwards = resolveRequestedPortForwards({
    cliPortForwards: input.requestPortForwards,
    pointerPortForwards: startedPointer.portForwards
  });

  return {
    launcherRequested: input.launcherRequested,
    tmuxSessionName,
    attachCommand: input.buildRemoteAttachCommand({
      host: startedPointer.host,
      ...(
        (startedPointer.user ?? remoteConfig.user) !== undefined
          ? { user: startedPointer.user ?? remoteConfig.user }
          : {}
      ),
      remoteClonePath: startedPointer.remoteClonePath,
      tmuxSessionName,
      ...(portForwards !== undefined ? { portForwards } : {})
    }),
    ...(remoteConfig.diagnostics !== undefined
      ? { diagnostics: remoteConfig.diagnostics }
      : {})
  };
}

export async function resolveAttachBubbleExecution<
  TAttachError extends Error,
  TReasonCode extends string
>(
  input: ResolveAttachBubbleExecutionInput<TAttachError, TReasonCode>
): Promise<ResolvedAttachBubbleExecution> {
  const { resolved } = input;
  let cachedGlobalConfigPromise: Promise<PairflowGlobalConfig> | undefined;
  const loadGlobalConfigOnce = (): Promise<PairflowGlobalConfig> => {
    cachedGlobalConfigPromise ??= input.loadPairflowGlobalConfig();
    return cachedGlobalConfigPromise;
  };
  const remotePointer = await readRemotePointerOrThrow({
    resolved,
    readRemotePointer: input.readRemotePointer,
    createAttachError: input.createAttachError
  });
  const launcherRequested = await resolveRequestedAttachLauncher({
    resolved,
    remotePointer,
    loadGlobalConfigOnce,
    createAttachError: input.createAttachError
  });

  return remotePointer === null
    ? resolveLocalAttachExecution({
        resolved,
        launcherRequested,
        executor: resolved.bubbleConfig.executor,
        checkTmuxSessionExists: input.checkTmuxSessionExists,
        createAttachError: input.createAttachError,
        buildAttachCommand: input.buildAttachCommand
      })
    : resolveRemoteAttachExecution({
        resolved,
        launcherRequested,
        remotePointer,
        loadGlobalConfigOnce,
        createAttachError: input.createAttachError,
        buildRemoteAttachCommand: input.buildRemoteAttachCommand,
        ...(input.request.portForwards !== undefined
          ? { requestPortForwards: input.request.portForwards }
          : {})
      });
}
