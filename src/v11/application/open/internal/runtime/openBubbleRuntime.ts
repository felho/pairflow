import { constants as fsConstants } from "node:fs";
import { access } from "node:fs/promises";

import {
  loadPairflowGlobalConfig,
  type PairflowGlobalConfig
} from "../../../../../config/pairflowConfig.js";
import type {
  BubbleRemotePointer
} from "../../../../shared/remote/remoteExecutionTypes.js";
import type { OpenBubbleResult } from "../../../../ports/openBubble.js";
import type { ResolveBubbleByIdPort } from "../../../../ports/bubbleLookup.js";
import {
  localOpenWorkspaceKind,
  remoteOpenWorkspaceKind,
  renderOpenCommand,
  renderRemoteOpenCommand,
  type RemoteOpenBaseContext,
  type RemoteOpenContext
} from "../rendering/openBubbleCommandRendering.js";
import {
  createOpenBubbleError
} from "../error/openBubbleErrorCreation.js";
import {
  enrichRemoteOpenContext,
  resolveOpenCommandTemplate,
  resolveOpenExecutionContext
} from "../resolution/openBubbleResolution.js";
import type {
  ProcessSpawnPort
} from "../../../../ports/processSpawn.js";
import type {
  OpenBubbleDependencies,
  OpenBubbleInput,
  OpenCommandExecutionInput,
  OpenCommandExecutionResult
} from "../../openBubbleContract.js";

export const executeOpenCommand = async (
  input: OpenCommandExecutionInput,
  processSpawn: ProcessSpawnPort
): Promise<OpenCommandExecutionResult> =>
  new Promise((resolvePromise, rejectPromise) => {
    const child = processSpawn("bash", ["-lc", input.command], {
      cwd: input.cwd,
      stdio: ["ignore", "pipe", "pipe"]
    });

    if (child.stdout === null || child.stderr === null) {
      rejectPromise(new Error("spawned open command did not expose pipe streams"));
      return;
    }

    let stdout = "";
    let stderr = "";

    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk: string) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk: string) => {
      stderr += chunk;
    });

    child.on("error", (error) => {
      rejectPromise(error);
    });

    child.on("close", (exitCode) => {
      resolvePromise({
        exitCode: exitCode ?? 1,
        stdout,
        stderr
      });
    });
  });

async function assertWorktreeExistsDefault(worktreePath: string): Promise<void> {
  await access(worktreePath, fsConstants.F_OK).catch(
    (error: NodeJS.ErrnoException) => {
      if (error.code === "ENOENT") {
        throw createOpenBubbleError({
          message: `Bubble worktree does not exist yet: ${worktreePath}. Start the bubble before opening it.`,
          context: {
            worktreePath,
            reason: "worktree_missing",
            reason_code: "OPEN_WORKTREE_MISSING"
          },
          cause: error
        });
      }
      throw error;
    }
  );
}

async function resolveOpenCommandAndContext(input: {
  resolved: Awaited<ReturnType<ResolveBubbleByIdPort>>;
  assertWorktreeExists: (worktreePath: string) => Promise<void>;
  readRemotePointerPort: (path: string) => Promise<BubbleRemotePointer | null>;
  loadGlobalConfigOnce: () => Promise<PairflowGlobalConfig>;
}): Promise<{
  command: string;
  executionContext:
    | {
        workspaceKind: typeof localOpenWorkspaceKind;
        workspacePath: string;
        worktreePath: string;
      }
    | {
        workspaceKind: typeof remoteOpenWorkspaceKind;
        workspacePath: string;
        remoteBase: RemoteOpenBaseContext;
      };
  remoteContext?: RemoteOpenContext;
}> {
  const executionContext = await resolveOpenExecutionContext({
    bubbleId: input.resolved.bubbleId,
    bubblePaths: input.resolved.bubblePaths,
    bubbleConfig: input.resolved.bubbleConfig,
    assertWorktreeExists: input.assertWorktreeExists,
    readRemotePointerPort: input.readRemotePointerPort
  });

  const commandTemplateResolution = await resolveOpenCommandTemplate({
    bubbleId: input.resolved.bubbleId,
    bubbleOpenCommand: input.resolved.bubbleConfig.open_command,
    bubbleOpenRemoteCommand: input.resolved.bubbleConfig.open_remote_command,
    workspaceKind: executionContext.workspaceKind,
    loadPairflowGlobalConfig: input.loadGlobalConfigOnce
  });
  const remoteContext =
    executionContext.workspaceKind === remoteOpenWorkspaceKind
      ? await enrichRemoteOpenContext({
          bubbleId: input.resolved.bubbleId,
          commandTemplate: commandTemplateResolution.commandTemplate,
          globalConfigWasConsulted:
            commandTemplateResolution.globalConfigWasConsulted,
          remoteBase: executionContext.remoteBase,
          loadGlobalConfigOnce: input.loadGlobalConfigOnce
        })
      : undefined;
  const command =
    executionContext.workspaceKind === localOpenWorkspaceKind
      ? renderOpenCommand(
          commandTemplateResolution.commandTemplate,
          executionContext.worktreePath
        )
      : renderRemoteOpenCommand({
          bubbleId: input.resolved.bubbleId,
          commandTemplate: commandTemplateResolution.commandTemplate,
          remote: remoteContext
            ?? (() => {
              throw createOpenBubbleError({
                message: "Remote open requires resolved remote context.",
                context: {
                  bubbleId: input.resolved.bubbleId,
                  reason: "remote_open_context_missing",
                  reason_code: "OPEN_DEPENDENCY_MISSING",
                  workspaceKind: remoteOpenWorkspaceKind
                }
              });
            })()
        });

  return {
    command,
    executionContext,
    ...(remoteContext !== undefined ? { remoteContext } : {})
  };
}

export async function openBubbleRuntime(
  input: OpenBubbleInput,
  dependencies: OpenBubbleDependencies
): Promise<OpenBubbleResult> {
  if (dependencies.resolveBubbleById === undefined) {
    throw createOpenBubbleError({
      message: "Open bubble requires a bubble resolver dependency.",
      context: {
        bubbleId: input.bubbleId,
        reason: "open_bubble_dependency_missing",
        reason_code: "OPEN_DEPENDENCY_MISSING"
      }
    });
  }

  const resolveBubble = dependencies.resolveBubbleById;
  const assertWorktreeExists =
    dependencies.assertWorktreeExists ?? assertWorktreeExistsDefault;
  const loadGlobalConfig =
    dependencies.loadPairflowGlobalConfig ?? loadPairflowGlobalConfig;
  if (dependencies.readRemotePointer === undefined) {
    throw createOpenBubbleError({
      message: "Open bubble requires a remote pointer reader dependency.",
      context: {
        bubbleId: input.bubbleId,
        reason: "open_bubble_dependency_missing",
        reason_code: "OPEN_DEPENDENCY_MISSING"
      }
    });
  }
  const readRemotePointerPort = dependencies.readRemotePointer;
  let cachedGlobalConfigPromise: Promise<PairflowGlobalConfig> | undefined;
  const loadGlobalConfigOnce = (): Promise<PairflowGlobalConfig> => {
    cachedGlobalConfigPromise ??= loadGlobalConfig();
    return cachedGlobalConfigPromise;
  };

  const resolved = await resolveBubble({
    bubbleId: input.bubbleId,
    ...(input.repoPath !== undefined ? { repoPath: input.repoPath } : {}),
    ...(input.cwd !== undefined ? { cwd: input.cwd } : {})
  });

  const resolvedCommand = await resolveOpenCommandAndContext({
    resolved,
    assertWorktreeExists,
    readRemotePointerPort,
    loadGlobalConfigOnce
  });
  const runCommand =
    dependencies.executeOpenCommand
    ?? ((commandInput) => {
      if (dependencies.processSpawn === undefined) {
        throw createOpenBubbleError({
          message: "Open bubble requires processSpawn dependency for default command execution.",
          context: {
            reason: "process_spawn_dependency_missing",
            reason_code: "OPEN_PROCESS_SPAWN_DEPENDENCY_MISSING"
          }
        });
      }
      return executeOpenCommand(commandInput, dependencies.processSpawn);
    });
  const executed = await runCommand({
    command: resolvedCommand.command,
    cwd: resolved.repoPath
  });

  if (executed.exitCode !== 0) {
    const details = executed.stderr.trim() || executed.stdout.trim();
    throw createOpenBubbleError({
      message:
        details.length > 0
          ? `Open command failed with exit code ${executed.exitCode}: ${details}`
          : `Open command failed with exit code ${executed.exitCode}.`,
      context: {
        bubbleId: resolved.bubbleId,
        command: resolvedCommand.command,
        cwd: resolved.repoPath,
        exitCode: executed.exitCode,
        reason: "open_command_failed",
        reason_code: "OPEN_COMMAND_FAILED",
        workspaceKind: resolvedCommand.executionContext.workspaceKind,
        workspacePath: resolvedCommand.executionContext.workspacePath,
        ...(resolvedCommand.executionContext.workspaceKind === localOpenWorkspaceKind
          ? { worktreePath: resolvedCommand.executionContext.worktreePath }
          : {
              remoteAuthority: resolvedCommand.remoteContext?.remoteAuthority,
              remoteAlias: resolvedCommand.remoteContext?.remoteAlias,
              remoteClonePath: resolvedCommand.remoteContext?.remoteClonePath,
              remoteHost: resolvedCommand.remoteContext?.remoteHost,
              ...(resolvedCommand.remoteContext?.remoteUser !== undefined
                ? { remoteUser: resolvedCommand.remoteContext.remoteUser }
                : {})
            })
      }
    });
  }

  return {
    bubbleId: resolved.bubbleId,
    workspaceKind: resolvedCommand.executionContext.workspaceKind,
    workspacePath: resolvedCommand.executionContext.workspacePath,
    ...(resolvedCommand.executionContext.workspaceKind === localOpenWorkspaceKind
      ? { worktreePath: resolvedCommand.executionContext.worktreePath }
      : { remoteAuthority: resolvedCommand.remoteContext?.remoteAuthority }),
    command: resolvedCommand.command
  };
}
