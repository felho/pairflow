import { mkdir, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";

import { BubbleLookupError, resolveBubbleById } from "./bubbleLookup.js";
import { buildBubbleTmuxSessionName } from "../runtime/tmuxManager.js";

export interface AttachBubbleInput {
  bubbleId: string;
  repoPath?: string | undefined;
  cwd?: string | undefined;
}

export interface AttachBubbleResult {
  bubbleId: string;
  tmuxSessionName: string;
}

export interface AttachCommandExecutionInput {
  command: string;
  cwd: string;
}

export interface AttachCommandExecutionResult {
  exitCode: number;
  stdout: string;
  stderr: string;
}

export type AttachCommandExecutor = (
  input: AttachCommandExecutionInput
) => Promise<AttachCommandExecutionResult>;

export type TmuxSessionChecker = (sessionName: string) => Promise<boolean>;

export interface AttachBubbleDependencies {
  executeAttachCommand?: AttachCommandExecutor;
  resolveBubbleById?: typeof resolveBubbleById;
  checkTmuxSessionExists?: TmuxSessionChecker;
  writeYamlFile?: (path: string, content: string) => Promise<void>;
}

export class AttachBubbleError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "AttachBubbleError";
  }
}

function buildWarpLaunchYaml(
  sessionName: string,
  cwd: string
): string {
  return [
    "---",
    `name: "${sessionName}"`,
    "windows:",
    "  - tabs:",
    "      - layout:",
    `          cwd: "${cwd}"`,
    "          commands:",
    `            - exec: "tmux attach -t ${sessionName}"`,
    ""
  ].join("\n");
}

export const executeAttachCommand: AttachCommandExecutor = async (
  input: AttachCommandExecutionInput
): Promise<AttachCommandExecutionResult> =>
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

async function checkTmuxSessionExistsDefault(sessionName: string): Promise<boolean> {
  return new Promise((resolvePromise) => {
    const child = spawn("tmux", ["has-session", "-t", sessionName], {
      stdio: ["ignore", "ignore", "ignore"]
    });

    child.on("error", () => {
      resolvePromise(false);
    });

    child.on("close", (exitCode) => {
      resolvePromise(exitCode === 0);
    });
  });
}

async function writeYamlFileDefault(path: string, content: string): Promise<void> {
  await writeFile(path, content, "utf8");
}

export async function attachBubble(
  input: AttachBubbleInput,
  dependencies: AttachBubbleDependencies = {}
): Promise<AttachBubbleResult> {
  const resolveBubble = dependencies.resolveBubbleById ?? resolveBubbleById;
  const checkSession = dependencies.checkTmuxSessionExists ?? checkTmuxSessionExistsDefault;
  const writeYaml = dependencies.writeYamlFile ?? writeYamlFileDefault;

  const resolved = await resolveBubble({
    bubbleId: input.bubbleId,
    ...(input.repoPath !== undefined ? { repoPath: input.repoPath } : {}),
    ...(input.cwd !== undefined ? { cwd: input.cwd } : {})
  });

  const tmuxSessionName = buildBubbleTmuxSessionName(resolved.bubbleId);

  const sessionExists = await checkSession(tmuxSessionName);
  if (!sessionExists) {
    throw new AttachBubbleError(
      `Tmux session "${tmuxSessionName}" does not exist. Start the bubble runtime first.`
    );
  }

  const cwd = resolved.repoPath;
  const yamlContent = buildWarpLaunchYaml(tmuxSessionName, cwd);
  const launchConfigDir = join(homedir(), ".warp", "launch_configurations");
  await mkdir(launchConfigDir, { recursive: true });
  const yamlPath = join(launchConfigDir, `${tmuxSessionName}.yaml`);

  await writeYaml(yamlPath, yamlContent);

  const command = `open "warp://launch/${tmuxSessionName}"`;
  const runCommand = dependencies.executeAttachCommand ?? executeAttachCommand;
  const executed = await runCommand({
    command,
    cwd: resolved.repoPath
  });

  if (executed.exitCode !== 0) {
    const details = executed.stderr.trim() || executed.stdout.trim();
    throw new AttachBubbleError(
      details.length > 0
        ? `Attach command failed with exit code ${executed.exitCode}: ${details}`
        : `Attach command failed with exit code ${executed.exitCode}.`
    );
  }

  return {
    bubbleId: resolved.bubbleId,
    tmuxSessionName
  };
}

export function asAttachBubbleError(error: unknown): never {
  if (error instanceof AttachBubbleError) {
    throw error;
  }
  if (error instanceof BubbleLookupError) {
    throw new AttachBubbleError(error.message);
  }
  if (error instanceof Error) {
    throw new AttachBubbleError(error.message);
  }
  throw error;
}
