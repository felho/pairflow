import { constants as fsConstants } from "node:fs";
import { access } from "node:fs/promises";
import { spawn } from "node:child_process";

import { BubbleLookupError, resolveBubbleById } from "./bubbleLookup.js";
import { shellQuote } from "../util/shellQuote.js";

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
  resolveBubbleById?: typeof resolveBubbleById;
  assertWorktreeExists?: (worktreePath: string) => Promise<void>;
}

export class OpenBubbleError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "OpenBubbleError";
  }
}

function renderOpenCommand(
  commandTemplate: string,
  worktreePath: string
): string {
  const template = commandTemplate.trim();
  if (template.length === 0) {
    throw new OpenBubbleError("open_command cannot be empty.");
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
        throw new OpenBubbleError(
          `Bubble worktree does not exist yet: ${worktreePath}. Start the bubble before opening it.`
        );
      }
      throw error;
    }
  );
}

export async function openBubble(
  input: OpenBubbleInput,
  dependencies: OpenBubbleDependencies = {}
): Promise<OpenBubbleResult> {
  const resolveBubble = dependencies.resolveBubbleById ?? resolveBubbleById;
  const assertWorktreeExists =
    dependencies.assertWorktreeExists ?? assertWorktreeExistsDefault;

  const resolved = await resolveBubble({
    bubbleId: input.bubbleId,
    ...(input.repoPath !== undefined ? { repoPath: input.repoPath } : {}),
    ...(input.cwd !== undefined ? { cwd: input.cwd } : {})
  });

  const worktreePath = resolved.bubblePaths.worktreePath;
  await assertWorktreeExists(worktreePath);

  const commandTemplate =
    resolved.bubbleConfig.open_command ?? defaultOpenCommandTemplate;
  const command = renderOpenCommand(commandTemplate, worktreePath);
  const runCommand = dependencies.executeOpenCommand ?? executeOpenCommand;
  const executed = await runCommand({
    command,
    cwd: resolved.repoPath
  });

  if (executed.exitCode !== 0) {
    const details = executed.stderr.trim() || executed.stdout.trim();
    throw new OpenBubbleError(
      details.length > 0
        ? `Open command failed with exit code ${executed.exitCode}: ${details}`
        : `Open command failed with exit code ${executed.exitCode}.`
    );
  }

  return {
    bubbleId: resolved.bubbleId,
    worktreePath,
    command
  };
}

export function asOpenBubbleError(error: unknown): never {
  if (error instanceof OpenBubbleError) {
    throw error;
  }
  if (error instanceof BubbleLookupError) {
    throw new OpenBubbleError(error.message);
  }
  if (error instanceof Error) {
    throw new OpenBubbleError(error.message);
  }
  throw error;
}
