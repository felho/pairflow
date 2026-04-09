import { constants as fsConstants } from "node:fs";
import { access } from "node:fs/promises";
import { spawn } from "node:child_process";

import { loadPairflowGlobalConfig } from "../../../config/pairflowConfig.js";
import type { ResolveBubbleByIdPort } from "../../shared/ports/bubbleLookup.js";
import { SchemaValidationError } from "../../shared/validation/primitives.js";
import { shellQuote } from "../../shared/foundation/shellQuote.js";

const worktreePathPlaceholder = "{{worktree_path}}";
const defaultOpenCommandTemplate = `cursor ${worktreePathPlaceholder}`;

export interface OpenBubbleInput {
  bubbleId: string;
  repoPath?: string | undefined;
  cwd?: string | undefined;
}

export interface OpenBubbleResult {
  bubbleId: string;
  worktreePath: string;
  command: string;
}

export interface OpenCommandExecutionInput {
  command: string;
  cwd: string;
}

export interface OpenCommandExecutionResult {
  exitCode: number;
  stdout: string;
  stderr: string;
}

export type OpenCommandExecutor = (
  input: OpenCommandExecutionInput
) => Promise<OpenCommandExecutionResult>;

export interface OpenBubbleDependencies {
  executeOpenCommand?: OpenCommandExecutor;
  resolveBubbleById?: ResolveBubbleByIdPort;
  assertWorktreeExists?: (worktreePath: string) => Promise<void>;
  loadPairflowGlobalConfig?: () => ReturnType<typeof loadPairflowGlobalConfig>;
}

interface OpenBubbleErrorContext {
  bubbleId?: string | undefined;
  command?: string | undefined;
  commandTemplate?: string | undefined;
  cwd?: string | undefined;
  exitCode?: number | undefined;
  reason?: string | undefined;
  worktreePath?: string | undefined;
}

interface OpenBubbleErrorOptions extends ErrorOptions {
  context?: OpenBubbleErrorContext | undefined;
}

export class OpenBubbleError extends Error {
  public readonly context: OpenBubbleErrorContext | undefined;

  public constructor(message: string, options?: OpenBubbleErrorOptions) {
    super(message, options);
    this.name = "OpenBubbleError";
    this.context = options?.context;
  }
}

export function createOpenBubbleError(input: {
  message: string;
  context: OpenBubbleErrorContext;
  cause?: unknown;
}): OpenBubbleError {
  return new OpenBubbleError(input.message, {
    context: input.context,
    ...(input.cause !== undefined ? { cause: input.cause } : {})
  });
}

function renderOpenCommand(
  commandTemplate: string,
  worktreePath: string
): string {
  const template = commandTemplate.trim();
  if (template.length === 0) {
    throw createOpenBubbleError({
      message: "open_command cannot be empty.",
      context: {
        commandTemplate,
        reason: "empty_open_command"
      }
    });
  }

  const quotedWorktreePath = shellQuote(worktreePath);
  if (template.includes(worktreePathPlaceholder)) {
    return template.split(worktreePathPlaceholder).join(quotedWorktreePath);
  }

  return `${template} ${quotedWorktreePath}`;
}

export const executeOpenCommand: OpenCommandExecutor = async (
  input: OpenCommandExecutionInput
): Promise<OpenCommandExecutionResult> =>
  new Promise((resolvePromise, rejectPromise) => {
    const child = spawn("bash", ["-lc", input.command], {
      cwd: input.cwd,
      stdio: ["ignore", "pipe", "pipe"]
    });

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
            reason: "worktree_missing"
          },
          cause: error
        });
      }
      throw error;
    }
  );
}

async function resolveOpenCommandTemplate(input: {
  bubbleId: string;
  bubbleOpenCommand: string | undefined;
  loadPairflowGlobalConfig: () => ReturnType<typeof loadPairflowGlobalConfig>;
}): Promise<string> {
  if (input.bubbleOpenCommand !== undefined) {
    return input.bubbleOpenCommand;
  }

  try {
    const globalConfig = await input.loadPairflowGlobalConfig();
    if (globalConfig.open_command !== undefined) {
      return globalConfig.open_command;
    }
  } catch (error) {
    if (error instanceof SchemaValidationError) {
      throw createOpenBubbleError({
        message: `Invalid global Pairflow config while opening bubble '${input.bubbleId}': ${error.message}`,
        context: {
          bubbleId: input.bubbleId,
          reason: "invalid_global_config"
        },
        cause: error
      });
    }

    const reason = error instanceof Error ? error.message : String(error);
    throw createOpenBubbleError({
      message: `Failed to load global Pairflow config while opening bubble '${input.bubbleId}': ${reason}`,
      context: {
        bubbleId: input.bubbleId,
        reason: "load_global_config_failed"
      },
      cause: error
    });
  }

  return defaultOpenCommandTemplate;
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
        reason: "open_bubble_dependency_missing"
      }
    });
  }

  const resolveBubble = dependencies.resolveBubbleById;
  const assertWorktreeExists =
    dependencies.assertWorktreeExists ?? assertWorktreeExistsDefault;
  const loadGlobalConfig =
    dependencies.loadPairflowGlobalConfig ?? loadPairflowGlobalConfig;

  const resolved = await resolveBubble({
    bubbleId: input.bubbleId,
    ...(input.repoPath !== undefined ? { repoPath: input.repoPath } : {}),
    ...(input.cwd !== undefined ? { cwd: input.cwd } : {})
  });

  const worktreePath = resolved.bubblePaths.worktreePath;
  await assertWorktreeExists(worktreePath);

  const commandTemplate = await resolveOpenCommandTemplate({
    bubbleId: resolved.bubbleId,
    bubbleOpenCommand: resolved.bubbleConfig.open_command,
    loadPairflowGlobalConfig: loadGlobalConfig
  });
  const command = renderOpenCommand(commandTemplate, worktreePath);
  const runCommand = dependencies.executeOpenCommand ?? executeOpenCommand;
  const executed = await runCommand({
    command,
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
        command,
        cwd: resolved.repoPath,
        exitCode: executed.exitCode,
        reason: "open_command_failed",
        worktreePath
      }
    });
  }

  return {
    bubbleId: resolved.bubbleId,
    worktreePath,
    command
  };
}
