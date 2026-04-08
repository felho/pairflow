import { spawn } from "node:child_process";
import { buildBubbleTmuxSessionName } from "../../../shared/bubble/tmuxSessionName.js";
import type {
  LaunchBubbleTmuxSessionInput,
  LaunchBubbleTmuxSessionPort,
  LaunchBubbleTmuxSessionResult,
  TerminateBubbleTmuxSessionInput,
  TerminateBubbleTmuxSessionPort,
  TerminateBubbleTmuxSessionResult,
  TmuxRunOptions,
  TmuxRunResult,
  TmuxRunner
} from "../../../shared/ports/tmuxSessions.js";
import { launchBubbleTmuxSessionLayout } from "./tmuxManagerSessionLayout.js";
import { seedBubbleTmuxPaneMessages } from "./tmuxManagerPaneSeed.js";

export type {
  LaunchBubbleTmuxSessionInput,
  LaunchBubbleTmuxSessionPort,
  LaunchBubbleTmuxSessionResult,
  TerminateBubbleTmuxSessionInput,
  TerminateBubbleTmuxSessionPort,
  TerminateBubbleTmuxSessionResult,
  TmuxRunOptions,
  TmuxRunResult,
  TmuxRunner
} from "../../../shared/ports/tmuxSessions.js";

export const runtimePaneIndices = {
  status: 0,
  implementer: 1,
  reviewer: 2,
  metaReviewer: 3
} as const;

function buildStatusPaneLabel(bubbleId: string): string {
  return `[orchestrator/status]-[${bubbleId}]`;
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

export { buildBubbleTmuxSessionName } from "../../../shared/bubble/tmuxSessionName.js";

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

export const launchBubbleTmuxSession: LaunchBubbleTmuxSessionPort = async (
  input: LaunchBubbleTmuxSessionInput
): Promise<LaunchBubbleTmuxSessionResult> => {
  const runner = input.runner ?? runTmux;
  const sessionName = buildBubbleTmuxSessionName(input.bubbleId);
  const statusPaneHeight = 13;
  const tmuxPaneSeparators = 4;
  const metaReviewerCommand = input.metaReviewerCommand ?? input.reviewerCommand;
  const statusPaneLabel = input.statusPaneLabel ?? buildStatusPaneLabel(input.bubbleId);
  const implementerPaneLabel = input.implementerPaneLabel ?? "[codex/implementer]";
  const reviewerPaneLabel = input.reviewerPaneLabel ?? "[claude/reviewer]";
  const metaReviewerPaneLabel =
    input.metaReviewerPaneLabel ?? "[codex/meta-reviewer]";

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
  const layout = await launchBubbleTmuxSessionLayout({
    runner,
    sessionName,
    worktreePath: input.worktreePath,
    statusPaneLabel,
    implementerPaneLabel,
    reviewerPaneLabel,
    metaReviewerPaneLabel,
    statusPaneHeight,
    tmuxPaneSeparators,
    implementerCommand: input.implementerCommand,
    reviewerCommand: input.reviewerCommand,
    metaReviewerCommand
  });
  await seedBubbleTmuxPaneMessages({
    runner,
    implementerPaneId: layout.implementerPaneId,
    reviewerPaneId: layout.reviewerPaneId,
    metaReviewerPaneId: layout.metaReviewerPaneId,
    implementerSubmitStartupPrompt: input.implementerSubmitStartupPrompt,
    reviewerSubmitStartupPrompt: input.reviewerSubmitStartupPrompt,
    metaReviewerSubmitStartupPrompt: input.metaReviewerSubmitStartupPrompt,
    implementerBootstrapMessage: input.implementerBootstrapMessage,
    reviewerBootstrapMessage: input.reviewerBootstrapMessage,
    metaReviewerBootstrapMessage: input.metaReviewerBootstrapMessage,
    implementerKickoffMessage: input.implementerKickoffMessage,
    reviewerKickoffMessage: input.reviewerKickoffMessage,
    metaReviewerKickoffMessage: input.metaReviewerKickoffMessage
  });

  return {
    sessionName
  };
};

function isTmuxMissingSessionError(output: string): boolean {
  const normalized = output.toLowerCase();
  return (
    normalized.includes("can't find session") ||
    normalized.includes("no server running") ||
    normalized.includes("no current target")
  );
}

export const terminateBubbleTmuxSession: TerminateBubbleTmuxSessionPort = async (
  input: TerminateBubbleTmuxSessionInput
): Promise<TerminateBubbleTmuxSessionResult> => {
  const runner = input.runner ?? runTmux;
  const sessionName =
    input.sessionName ?? (input.bubbleId !== undefined
      ? buildBubbleTmuxSessionName(input.bubbleId)
      : undefined);

  if (sessionName === undefined) {
    throw new Error(
      "TMUX_TERMINATE_SESSION_INPUT_REQUIRED: context operation_id=terminate_bubble_tmux_session requires sessionName or bubbleId."
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
};

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
