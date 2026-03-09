import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { maybeAcceptClaudeTrustPrompt, sendAndSubmitTmuxPaneMessage } from "./tmuxInput.js";

export const runtimePaneIndices = {
  status: 0,
  implementer: 1,
  reviewer: 2,
  metaReviewer: 3
} as const;

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
  metaReviewerCommand?: string;
  implementerBootstrapMessage?: string;
  reviewerBootstrapMessage?: string;
  metaReviewerBootstrapMessage?: string;
  implementerKickoffMessage?: string;
  reviewerKickoffMessage?: string;
  metaReviewerKickoffMessage?: string;
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

function parseTmuxPaneId(stdout: string, command: string[]): string {
  const paneId = stdout.trim();
  if (!/^%[0-9]+$/u.test(paneId)) {
    throw new Error(
      `tmux did not return a pane id for command: tmux ${command.join(" ")} (stdout=${JSON.stringify(stdout)})`
    );
  }
  return paneId;
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
    const env = { ...process.env };
    delete env.CLAUDECODE;
    const child = spawn("tmux", args, {
      cwd: options.cwd,
      env,
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
  const statusPaneHeight = 12;
  const tmuxPaneSeparators = 3;
  const metaReviewerCommand = input.metaReviewerCommand ?? input.reviewerCommand;

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
  // Keep pane indices stable even if one startup command exits unexpectedly.
  // Runtime routing depends on fixed 0/1/2/3 pane positions.
  await runner([
    "set-option",
    "-t",
    `${sessionName}:0`,
    "remain-on-exit",
    "on"
  ]);
  // Strip selected env vars from both tmux server-global and session env.
  // The client-side env is not enough: panes inherit from the tmux server.
  // - CLAUDECODE: prevents nested Claude Code false-positive detection.
  // - NO_COLOR: allows status-pane ANSI colors by default in tmux.
  const envVarsToUnset = ["CLAUDECODE", "NO_COLOR"] as const;
  for (const variableName of envVarsToUnset) {
    await runner(["set-environment", "-g", "-u", variableName]);
    await runner(["set-environment", "-t", sessionName, "-u", variableName]);
  }
  const statusPane = `${sessionName}:0.0`;
  // Split status pane to create implementer pane.
  const implementerSplitCommand = [
    "split-window",
    "-v",
    "-P",
    "-F",
    "#{pane_id}",
    "-t",
    statusPane,
    "-c",
    input.worktreePath,
    input.implementerCommand
  ];
  const implementerSplit = await runner(implementerSplitCommand);
  const implementerPaneId = parseTmuxPaneId(implementerSplit.stdout, implementerSplitCommand);
  // Fix status pane to 12 lines BEFORE splitting for reviewer, so the
  // subsequent 50/50 split divides the remaining space equally.
  await runner([
    "resize-pane",
    "-t",
    statusPane,
    "-y",
    String(statusPaneHeight)
  ]);
  // Split implementer pane in half for reviewer.
  const reviewerSplitCommand = [
    "split-window",
    "-v",
    "-P",
    "-F",
    "#{pane_id}",
    "-t",
    implementerPaneId,
    "-p",
    "50",
    "-c",
    input.worktreePath,
    input.reviewerCommand
  ];
  const reviewerSplit = await runner(reviewerSplitCommand);
  const reviewerPaneId = parseTmuxPaneId(reviewerSplit.stdout, reviewerSplitCommand);
  // Split reviewer pane in half for dedicated meta-reviewer pane.
  const metaReviewerSplitCommand = [
    "split-window",
    "-v",
    "-P",
    "-F",
    "#{pane_id}",
    "-t",
    reviewerPaneId,
    "-p",
    "50",
    "-c",
    input.worktreePath,
    metaReviewerCommand
  ];
  const metaReviewerSplit = await runner(metaReviewerSplitCommand);
  const metaReviewerPaneId = parseTmuxPaneId(
    metaReviewerSplit.stdout,
    metaReviewerSplitCommand
  );
  // Re-fix status pane after the second split — the split may have
  // redistributed vertical space away from the initial 12-line resize.
  await runner([
    "resize-pane",
    "-t",
    statusPane,
    "-y",
    String(statusPaneHeight)
  ]);
  // Keep the status pane fixed at 12 lines when the terminal is resized.
  // We use client-resized (fires when the terminal window changes size)
  // instead of after-resize-pane (which would recurse on its own resize).
  // The hook fixes pane 0 to 12 lines, then keeps panes 1/2/3 balanced.
  // Keep the status pane fixed at 12 lines when the terminal window is resized.
  // client-resized fires when the terminal emulator window changes size.
  // #{window_height} is expanded by tmux before passing to run-shell.
  // All resize logic runs inside a single run-shell to avoid spawn quoting issues.
  const layoutScript = [
    `tmux resize-pane -t ${statusPane} -y ${statusPaneHeight} 2>/dev/null || true`,
    `REMAIN=$((#{window_height} - ${statusPaneHeight + tmuxPaneSeparators}))`,
    "if [ $REMAIN -lt 3 ]; then REMAIN=3; fi",
    "ROW=$((REMAIN / 3))",
    "if [ $ROW -lt 1 ]; then ROW=1; fi",
    `tmux resize-pane -t ${implementerPaneId} -y $ROW 2>/dev/null || true`,
    `tmux resize-pane -t ${reviewerPaneId} -y $ROW 2>/dev/null || true`
  ].join("; ");
  const s = sessionName;
  await runner([
    "set-hook",
    "-t",
    s,
    "client-resized",
    `run-shell "${layoutScript}"`
  ]);
  await runner(["run-shell", layoutScript]);
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

  await sendPaneMessage(implementerPaneId, input.implementerBootstrapMessage);
  await sendPaneMessage(reviewerPaneId, input.reviewerBootstrapMessage);
  await sendPaneMessage(metaReviewerPaneId, input.metaReviewerBootstrapMessage);
  await sendPaneMessage(implementerPaneId, input.implementerKickoffMessage);
  await sendPaneMessage(reviewerPaneId, input.reviewerKickoffMessage);
  await sendPaneMessage(metaReviewerPaneId, input.metaReviewerKickoffMessage);

  return {
    sessionName
  };
}

function isTmuxMissingSessionError(output: string): boolean {
  const normalized = output.toLowerCase();
  return (
    normalized.includes("can't find session") ||
    normalized.includes("no server running") ||
    normalized.includes("no current target")
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
