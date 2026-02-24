import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { maybeAcceptClaudeTrustPrompt, sendAndSubmitTmuxPaneMessage } from "./tmuxInput.js";

export interface TmuxRunResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

export interface TmuxRunOptions {
  cwd?: string;
  allowFailure?: boolean;
}

export type TmuxRunner = (
  args: string[],
  options?: TmuxRunOptions
) => Promise<TmuxRunResult>;

export interface LaunchBubbleTmuxSessionInput {
  bubbleId: string;
  worktreePath: string;
  statusCommand: string;
  implementerCommand: string;
  reviewerCommand: string;
  implementerBootstrapMessage?: string;
  reviewerBootstrapMessage?: string;
  implementerKickoffMessage?: string;
  runner?: TmuxRunner;
}

export interface LaunchBubbleTmuxSessionResult {
  sessionName: string;
}

export interface TerminateBubbleTmuxSessionInput {
  bubbleId?: string;
  sessionName?: string;
  runner?: TmuxRunner;
}

export interface TerminateBubbleTmuxSessionResult {
  sessionName: string;
  existed: boolean;
}

export interface RespawnTmuxPaneCommandInput {
  sessionName: string;
  paneIndex: number;
  cwd: string;
  command: string;
  runner?: TmuxRunner;
}

export class TmuxCommandError extends Error {
  public readonly args: string[];
  public readonly exitCode: number;
  public readonly stderr: string;

  public constructor(args: string[], exitCode: number, stderr: string) {
    super(
      `tmux command failed (exit ${exitCode}): tmux ${args.join(" ")}\n${stderr.trim()}`
    );
    this.name = "TmuxCommandError";
    this.args = args;
    this.exitCode = exitCode;
    this.stderr = stderr;
  }
}

export class TmuxSessionExistsError extends Error {
  public readonly sessionName: string;

  public constructor(sessionName: string) {
    super(`tmux session already exists: ${sessionName}`);
    this.name = "TmuxSessionExistsError";
    this.sessionName = sessionName;
  }
}

function normalizeSessionComponent(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]/gu, "-").replace(/-+/gu, "-");
}

export function buildBubbleTmuxSessionName(bubbleId: string): string {
  const maxSessionNameLength = 32;
  const sessionPrefix = "pf-";
  const normalized = normalizeSessionComponent(bubbleId.trim());
  if (normalized.length === 0) {
    throw new Error("Bubble id cannot be empty for tmux session naming.");
  }

  const directName = `${sessionPrefix}${normalized}`;
  if (directName.length <= maxSessionNameLength) {
    return directName;
  }

  const hashSuffix = createHash("sha1")
    .update(normalized)
    .digest("hex")
    .slice(0, 8);
  const headMaxLength = maxSessionNameLength - sessionPrefix.length - 1 - hashSuffix.length;
  const head = normalized.slice(0, Math.max(1, headMaxLength)).replace(/-+$/gu, "");
  return `${sessionPrefix}${head}-${hashSuffix}`;
}

export const runTmux: TmuxRunner = async (
  args: string[],
  options: TmuxRunOptions = {}
): Promise<TmuxRunResult> =>
  new Promise((resolvePromise, rejectPromise) => {
    const child = spawn("tmux", args, {
      cwd: options.cwd,
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
      const code = exitCode ?? 1;
      if (code !== 0 && !options.allowFailure) {
        rejectPromise(new TmuxCommandError(args, code, stderr));
        return;
      }

      resolvePromise({
        stdout,
        stderr,
        exitCode: code
      });
    });
  });

export async function launchBubbleTmuxSession(
  input: LaunchBubbleTmuxSessionInput
): Promise<LaunchBubbleTmuxSessionResult> {
  const runner = input.runner ?? runTmux;
  const sessionName = buildBubbleTmuxSessionName(input.bubbleId);

  const hasSession = await runner(["has-session", "-t", sessionName], {
    allowFailure: true
  });
  if (hasSession.exitCode === 0) {
    throw new TmuxSessionExistsError(sessionName);
  }

  await runner([
    "new-session",
    "-d",
    "-s",
    sessionName,
    "-c",
    input.worktreePath,
    input.statusCommand
  ]);
  await runner([
    "split-window",
    "-v",
    "-t",
    `${sessionName}:0.0`,
    "-c",
    input.worktreePath,
    input.implementerCommand
  ]);
  await runner([
    "split-window",
    "-v",
    "-t",
    `${sessionName}:0.1`,
    "-c",
    input.worktreePath,
    input.reviewerCommand
  ]);
  await runner([
    "select-layout",
    "-t",
    `${sessionName}:0`,
    "even-vertical"
  ]);
  const sendPaneMessage = async (
    targetPane: string,
    message: string | undefined
  ): Promise<void> => {
    if ((message?.trim().length ?? 0) === 0) {
      return;
    }

    // Claude can pause on first-use trust prompt for each worktree.
    // Best effort auto-accept keeps startup fully non-interactive.
    await maybeAcceptClaudeTrustPrompt(runner, targetPane).catch(() => undefined);

    await sendAndSubmitTmuxPaneMessage(runner, targetPane, message as string);
  };

  await sendPaneMessage(`${sessionName}:0.1`, input.implementerBootstrapMessage);
  await sendPaneMessage(`${sessionName}:0.2`, input.reviewerBootstrapMessage);
  await sendPaneMessage(`${sessionName}:0.1`, input.implementerKickoffMessage);

  return {
    sessionName
  };
}

function isTmuxMissingSessionError(output: string): boolean {
  const normalized = output.toLowerCase();
  return (
    normalized.includes("can't find session") ||
    normalized.includes("no server running")
  );
}

export async function terminateBubbleTmuxSession(
  input: TerminateBubbleTmuxSessionInput
): Promise<TerminateBubbleTmuxSessionResult> {
  const runner = input.runner ?? runTmux;
  const sessionName =
    input.sessionName ?? (input.bubbleId !== undefined
      ? buildBubbleTmuxSessionName(input.bubbleId)
      : undefined);

  if (sessionName === undefined) {
    throw new Error(
      "terminateBubbleTmuxSession requires either sessionName or bubbleId."
    );
  }

  const result = await runner(["kill-session", "-t", sessionName], {
    allowFailure: true
  });

  if (result.exitCode === 0) {
    return {
      sessionName,
      existed: true
    };
  }

  const combinedOutput = `${result.stderr}\n${result.stdout}`;
  if (isTmuxMissingSessionError(combinedOutput)) {
    return {
      sessionName,
      existed: false
    };
  }

  throw new TmuxCommandError(
    ["kill-session", "-t", sessionName],
    result.exitCode,
    result.stderr
  );
}

export async function respawnTmuxPaneCommand(
  input: RespawnTmuxPaneCommandInput
): Promise<void> {
  const runner = input.runner ?? runTmux;
  const targetPane = `${input.sessionName}:0.${input.paneIndex}`;
  await runner([
    "respawn-pane",
    "-k",
    "-t",
    targetPane,
    "-c",
    input.cwd,
    input.command
  ]);
}
