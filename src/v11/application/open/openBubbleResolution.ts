import type { PairflowGlobalConfig } from "../../../config/pairflowConfig.js";
import type {
  BubbleRemotePointer,
  BubbleRemotePointerStarted
} from "../../shared/remote/remoteExecutionTypes.js";
import type { OpenWorkspaceKind } from "../../ports/openBubble.js";
import { SchemaValidationError } from "../../shared/validation/primitives.js";
import {
  defaultOpenCommandTemplate,
  defaultOpenRemoteCommandTemplate,
  localOpenWorkspaceKind,
  remoteOpenWorkspaceKind,
  type RemoteOpenBaseContext,
  type RemoteOpenContext
} from "./openBubbleCommandRendering.js";
import { createOpenBubbleError } from "./openBubbleError.js";

function readRemotePointerOrThrow(input: {
  bubbleId: string;
  remotePointerPath: string;
  readRemotePointerPort: (path: string) => Promise<BubbleRemotePointer | null>;
}): Promise<BubbleRemotePointer | null> {
  return input.readRemotePointerPort(input.remotePointerPath).catch((error) => {
    if (error instanceof SchemaValidationError) {
      throw createOpenBubbleError({
        message:
          `Remote open for '${input.bubbleId}' requires a valid remote pointer: `
          + `${error.message}`,
        context: {
          bubbleId: input.bubbleId,
          reason: "remote_pointer_invalid",
          reason_code: "OPEN_REMOTE_POINTER_INVALID",
          workspaceKind: remoteOpenWorkspaceKind
        },
        cause: error
      });
    }
    throw error;
  });
}

async function loadGlobalConfigOrThrow(
  input: {
    bubbleId: string;
    loadPairflowGlobalConfig: () => Promise<PairflowGlobalConfig>;
  }
): Promise<PairflowGlobalConfig> {
  try {
    return await input.loadPairflowGlobalConfig();
  } catch (error) {
    if (error instanceof SchemaValidationError) {
      throw createOpenBubbleError({
        message: `Invalid global Pairflow config while opening bubble '${input.bubbleId}': ${error.message}`,
        context: {
          bubbleId: input.bubbleId,
          reason: "invalid_global_config",
          reason_code: "OPEN_GLOBAL_CONFIG_INVALID"
        },
        cause: error
      });
    }

    const reason = error instanceof Error ? error.message : String(error);
    throw createOpenBubbleError({
      message: `Failed to load global Pairflow config while opening bubble '${input.bubbleId}': ${reason}`,
      context: {
        bubbleId: input.bubbleId,
        reason: "load_global_config_failed",
        reason_code: "OPEN_GLOBAL_CONFIG_LOAD_FAILED"
      },
      cause: error
    });
  }
}

function validateStartedRemotePointer(input: {
  bubbleId: string;
  remoteAlias: string;
  pointer: BubbleRemotePointerStarted;
}): BubbleRemotePointerStarted {
  if (
    input.pointer.host.trim().length > 0
    && input.pointer.remoteClonePath.trim().length > 0
    && input.pointer.remoteClonePath.startsWith("/")
  ) {
    return input.pointer;
  }

  throw createOpenBubbleError({
    message:
      `Remote open for '${input.bubbleId}' requires a valid started pointer with `
      + "host and absolute remote clone path.",
    context: {
      bubbleId: input.bubbleId,
      remoteAlias: input.remoteAlias,
      remoteHost: input.pointer.host,
      remoteClonePath: input.pointer.remoteClonePath,
      reason: "remote_pointer_invalid",
      reason_code: "OPEN_REMOTE_POINTER_INVALID",
      workspaceKind: remoteOpenWorkspaceKind
    }
  });
}

function resolveRemoteUserSupplement(input: {
  bubbleId: string;
  remoteAlias: string;
  startedPointer: BubbleRemotePointerStarted;
  globalConfig: PairflowGlobalConfig;
}): string | undefined {
  const remoteConfig = input.globalConfig.remotes?.[input.remoteAlias];
  if (remoteConfig === undefined) {
    return input.startedPointer.user;
  }

  if (remoteConfig.host !== input.startedPointer.host) {
    throw createOpenBubbleError({
      message:
        `Remote open for '${input.bubbleId}' refused host mismatch: pointer host `
        + `(${input.startedPointer.host}) does not match configured execution host `
        + `(${remoteConfig.host}).`,
      context: {
        bubbleId: input.bubbleId,
        remoteAlias: input.remoteAlias,
        remoteHost: remoteConfig.host,
        reason: "remote_host_drift",
        reason_code: "OPEN_REMOTE_HOST_DRIFT",
        workspaceKind: remoteOpenWorkspaceKind
      }
    });
  }

  if (
    input.startedPointer.user !== undefined
    && remoteConfig.user !== undefined
    && remoteConfig.user !== input.startedPointer.user
  ) {
    throw createOpenBubbleError({
      message:
        `Remote open for '${input.bubbleId}' refused ambiguous authority: pointer user `
        + `(${input.startedPointer.user}) does not match configured remote user `
        + `(${remoteConfig.user}).`,
      context: {
        bubbleId: input.bubbleId,
        remoteAlias: input.remoteAlias,
        remoteHost: input.startedPointer.host,
        remoteUser: remoteConfig.user,
        reason: "remote_authority_ambiguous",
        reason_code: "OPEN_REMOTE_AUTHORITY_AMBIGUOUS",
        workspaceKind: remoteOpenWorkspaceKind
      }
    });
  }

  return input.startedPointer.user ?? remoteConfig.user;
}

function remoteCommandNeedsRemoteConfig(
  commandTemplate: string,
  remoteUser: string | undefined,
  globalConfigWasConsulted: boolean
): boolean {
  const remoteIdentityIsNeeded =
    commandTemplate.includes("{{remote_user}}")
    || commandTemplate.includes("{{remote_authority}}")
    || commandTemplate.includes("vscode-remote://ssh-remote+{{remote_authority}}{{remote_clone_path}}");

  if (!remoteIdentityIsNeeded) {
    return false;
  }

  if (globalConfigWasConsulted) {
    return true;
  }

  return remoteUser === undefined;
}

export async function resolveOpenCommandTemplate(input: {
  bubbleId: string;
  bubbleOpenCommand: string | undefined;
  bubbleOpenRemoteCommand: string | undefined;
  workspaceKind: OpenWorkspaceKind;
  loadPairflowGlobalConfig: () => Promise<PairflowGlobalConfig>;
}): Promise<{
  commandTemplate: string;
  globalConfigWasConsulted: boolean;
}> {
  const bubbleTemplate =
    input.workspaceKind === localOpenWorkspaceKind
      ? input.bubbleOpenCommand
      : input.bubbleOpenRemoteCommand;
  if (bubbleTemplate !== undefined) {
    return {
      commandTemplate: bubbleTemplate,
      globalConfigWasConsulted: false
    };
  }

  const globalConfig = await loadGlobalConfigOrThrow({
    bubbleId: input.bubbleId,
    loadPairflowGlobalConfig: input.loadPairflowGlobalConfig
  });
  const globalTemplate =
    input.workspaceKind === localOpenWorkspaceKind
      ? globalConfig.open_command
      : globalConfig.open_remote_command;
  if (globalTemplate !== undefined) {
    return {
      commandTemplate: globalTemplate,
      globalConfigWasConsulted: true
    };
  }

  return {
    commandTemplate:
      input.workspaceKind === localOpenWorkspaceKind
        ? defaultOpenCommandTemplate
        : defaultOpenRemoteCommandTemplate,
    globalConfigWasConsulted: true
  };
}

export async function enrichRemoteOpenContext(input: {
  bubbleId: string;
  commandTemplate: string;
  globalConfigWasConsulted: boolean;
  remoteBase: RemoteOpenBaseContext;
  loadGlobalConfigOnce: () => Promise<PairflowGlobalConfig>;
}): Promise<RemoteOpenContext> {
  const globalConfig = remoteCommandNeedsRemoteConfig(
    input.commandTemplate,
    input.remoteBase.remoteUser,
    input.globalConfigWasConsulted
  )
    ? await input.loadGlobalConfigOnce()
    : undefined;

  const remoteUser =
    globalConfig !== undefined
      ? resolveRemoteUserSupplement({
          bubbleId: input.bubbleId,
          remoteAlias: input.remoteBase.remoteAlias,
          startedPointer: {
            kind: "started",
            host: input.remoteBase.remoteHost,
            ...(input.remoteBase.remoteUser !== undefined
              ? { user: input.remoteBase.remoteUser }
              : {}),
            instanceId: "open-context-supplement",
            remoteClonePath: input.remoteBase.remoteClonePath,
            tmuxSession: "open-context-supplement",
            startedAt: "1970-01-01T00:00:00.000Z"
          },
          globalConfig
        })
      : input.remoteBase.remoteUser;

  return {
    remoteAlias: input.remoteBase.remoteAlias,
    remoteHost: input.remoteBase.remoteHost,
    ...(remoteUser !== undefined ? { remoteUser } : {}),
    remoteAuthority:
      remoteUser !== undefined
        ? `${remoteUser}@${input.remoteBase.remoteHost}`
        : input.remoteBase.remoteHost,
    remoteClonePath: input.remoteBase.remoteClonePath
  };
}

export async function resolveOpenExecutionContext(input: {
  bubbleId: string;
  bubblePaths: {
    worktreePath: string;
    remotePointerPath: string;
  };
  bubbleConfig: {
    executor?: {
      type: "ssh";
      remote: string;
    } | undefined;
  } & {
    open_command?: string | undefined;
    open_remote_command?: string | undefined;
  };
  assertWorktreeExists: (worktreePath: string) => Promise<void>;
  readRemotePointerPort: (path: string) => Promise<BubbleRemotePointer | null>;
}): Promise<
  | {
      workspaceKind: typeof localOpenWorkspaceKind;
      workspacePath: string;
      worktreePath: string;
    }
  | {
      workspaceKind: typeof remoteOpenWorkspaceKind;
      workspacePath: string;
      remoteBase: RemoteOpenBaseContext;
    }
> {
  const executor = input.bubbleConfig.executor;
  if (executor?.type !== "ssh") {
    await input.assertWorktreeExists(input.bubblePaths.worktreePath);
    return {
      workspaceKind: localOpenWorkspaceKind,
      workspacePath: input.bubblePaths.worktreePath,
      worktreePath: input.bubblePaths.worktreePath
    };
  }

  const remotePointer = await readRemotePointerOrThrow({
    bubbleId: input.bubbleId,
    remotePointerPath: input.bubblePaths.remotePointerPath,
    readRemotePointerPort: input.readRemotePointerPort
  });

  if (remotePointer === null || remotePointer.kind === "created") {
    throw createOpenBubbleError({
      message:
        `Remote bubble '${input.bubbleId}' is not started yet. Run `
        + `\`pairflow bubble start --id ${input.bubbleId}\` first.`,
      context: {
        bubbleId: input.bubbleId,
        remoteAlias: executor.remote,
        ...(remotePointer?.host !== undefined && remotePointer.host.trim().length > 0
          ? { remoteHost: remotePointer.host }
          : {}),
        reason: "remote_open_start_required",
        reason_code: "OPEN_REMOTE_START_REQUIRED",
        workspaceKind: remoteOpenWorkspaceKind
      }
    });
  }

  const startedPointer = validateStartedRemotePointer({
    bubbleId: input.bubbleId,
    remoteAlias: executor.remote,
    pointer: remotePointer
  });

  return {
    workspaceKind: remoteOpenWorkspaceKind,
    workspacePath: startedPointer.remoteClonePath,
    remoteBase: {
      remoteAlias: executor.remote,
      remoteHost: startedPointer.host,
      ...(startedPointer.user !== undefined ? { remoteUser: startedPointer.user } : {}),
      remoteClonePath: startedPointer.remoteClonePath
    }
  };
}
