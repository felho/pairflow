import { buildBubbleTmuxSessionName } from "../../../shared/bubble/tmuxSessionName.js";
import type {
  LaunchBubbleTmuxSessionAck,
  LaunchBubbleTmuxSessionInput,
  LaunchBubbleTmuxSessionPort,
  LaunchBubbleTmuxSessionResult,
  TerminateBubbleTmuxSessionInput,
  TerminateBubbleTmuxSessionPort,
  TerminateBubbleTmuxSessionResult,
  TmuxRunner
} from "../../../shared/ports/tmuxSessions.js";
import {
  runTmux,
  TmuxCommandError
} from "./tmuxRunner.js";
import { launchBubbleTmuxSessionLayout } from "./tmuxManagerSessionLayout.js";
import { seedBubbleTmuxPaneMessages } from "./tmuxManagerPaneSeed.js";

export type {
  LaunchBubbleTmuxSessionAck,
  LaunchBubbleTmuxSessionAckFailureKind,
  LaunchBubbleTmuxSessionAckPort,
  LaunchBubbleTmuxSessionAckReasonCode,
  LaunchBubbleTmuxSessionAckStatus,
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
export { runTmux, TmuxCommandError } from "./tmuxRunner.js";

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

export class TmuxSessionExistsError extends Error {
  public readonly sessionName: string;

  public constructor(sessionName: string) {
    super(`tmux session already exists: ${sessionName}`);
    this.name = "TmuxSessionExistsError";
    this.sessionName = sessionName;
  }
}

export { buildBubbleTmuxSessionName } from "../../../shared/bubble/tmuxSessionName.js";

function resolveLaunchWorkspacePath(input: LaunchBubbleTmuxSessionInput): string {
  const workspacePath = input.workspacePath.trim();
  if (workspacePath.length === 0) {
    throw new Error(
      `TMUX_LAUNCH_WORKSPACE_REQUIRED: context operation_id=launch_bubble_tmux_session bubble_id=${input.bubbleId}.`
    );
  }
  return workspacePath;
}

function createLaunchBubbleTmuxSessionFailureAck(
  input:
    | {
      failureKind: "workspace_required";
      errorMessage: string;
    }
    | {
      failureKind: "session_exists";
      errorMessage: string;
      sessionName: string;
    }
    | {
      failureKind: "tmux_command_failed";
      errorMessage: string;
      sessionName: string;
    }
): LaunchBubbleTmuxSessionAck {
  switch (input.failureKind) {
    case "workspace_required":
      return {
        status: "failed_to_start",
        reason_code: "LAUNCH_ACK_WORKSPACE_REQUIRED",
        failure_kind: "workspace_required",
        error_message: input.errorMessage
      };
    case "session_exists":
      return {
        status: "failed_to_start",
        reason_code: "LAUNCH_ACK_SESSION_EXISTS",
        failure_kind: "session_exists",
        error_message: input.errorMessage,
        sessionName: input.sessionName
      };
    case "tmux_command_failed":
      return {
        status: "failed_to_start",
        reason_code: "LAUNCH_ACK_TMUX_COMMAND_FAILED",
        failure_kind: "tmux_command_failed",
        error_message: input.errorMessage,
        sessionName: input.sessionName
      };
  }
}

interface LaunchBubbleTmuxSessionAckResolution {
  ack: LaunchBubbleTmuxSessionAck;
  legacyError?: Error;
}

function createLaunchBubbleTmuxSessionAckResolution(
  input:
    | {
      failureKind: "workspace_required";
      errorMessage: string;
      legacyError?: Error;
    }
    | {
      failureKind: "session_exists";
      errorMessage: string;
      sessionName: string;
      legacyError?: Error;
    }
    | {
      failureKind: "tmux_command_failed";
      errorMessage: string;
      sessionName: string;
      legacyError?: Error;
    }
): LaunchBubbleTmuxSessionAckResolution {
  const { legacyError, ...ackInput } = input;
  return {
    ack: createLaunchBubbleTmuxSessionFailureAck(ackInput),
    ...(legacyError !== undefined ? { legacyError } : {})
  };
}

function projectRunningLaunchBubbleTmuxSessionAckToResult(
  ack: Extract<LaunchBubbleTmuxSessionAck, { status: "running" }>
): LaunchBubbleTmuxSessionResult {
  return {
    sessionName: ack.sessionName
  };
}

function isLaunchAckInternalInvariantError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }
  return (
    error.message.startsWith("ACK_CANONICALIZATION_FAILED:") ||
    error.message.startsWith("TMUX_PANE_ID_PARSE_FAILED:")
  );
}

export async function launchBubbleTmuxSessionAck(
  input: LaunchBubbleTmuxSessionInput
): Promise<LaunchBubbleTmuxSessionAck> {
  const resolution = await resolveLaunchBubbleTmuxSessionAck(input);
  return resolution.ack;
}

async function resolveLaunchBubbleTmuxSessionAck(
  input: LaunchBubbleTmuxSessionInput
): Promise<LaunchBubbleTmuxSessionAckResolution> {
  const runner = input.runner ?? runTmux;
  const sessionName = buildBubbleTmuxSessionName(input.bubbleId);
  let workspacePath: string;
  try {
    workspacePath = resolveLaunchWorkspacePath(input);
  } catch (error) {
    const legacyError = error instanceof Error ? error : new Error(String(error));
    return createLaunchBubbleTmuxSessionAckResolution({
      failureKind: "workspace_required",
      errorMessage: legacyError.message,
      legacyError
    });
  }
  const statusPaneHeight = 13;
  const tmuxPaneSeparators = 4;
  const metaReviewerCommand = input.metaReviewerCommand ?? input.reviewerCommand;
  const statusPaneLabel = input.statusPaneLabel ?? buildStatusPaneLabel(input.bubbleId);
  const implementerPaneLabel = input.implementerPaneLabel ?? "[codex/implementer]";
  const reviewerPaneLabel = input.reviewerPaneLabel ?? "[claude/reviewer]";
  const metaReviewerPaneLabel =
    input.metaReviewerPaneLabel ?? "[codex/meta-reviewer]";

  try {
    const hasSession = await runner(["has-session", "-t", sessionName], {
      allowFailure: true
    });
    if (hasSession.exitCode === 0) {
      const legacyError = new TmuxSessionExistsError(sessionName);
      return createLaunchBubbleTmuxSessionAckResolution({
        failureKind: "session_exists",
        errorMessage: legacyError.message,
        sessionName,
        legacyError
      });
    }
    if (hasSession.exitCode !== 1) {
      const legacyError = new TmuxCommandError(
        ["has-session", "-t", sessionName],
        hasSession.exitCode,
        hasSession.stderr || hasSession.stdout
      );
      return createLaunchBubbleTmuxSessionAckResolution({
        failureKind: "tmux_command_failed",
        errorMessage: legacyError.message,
        sessionName,
        legacyError
      });
    }

    await runner([
      "new-session",
      "-d",
      "-s",
      sessionName,
      "-c",
      workspacePath,
      input.statusCommand
    ]);
    const layout = await launchBubbleTmuxSessionLayout({
      runner,
      sessionName,
      workspacePath,
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
      ack: {
        status: "running",
        sessionName
      }
    };
  } catch (error) {
    if (isLaunchAckInternalInvariantError(error)) {
      throw error;
    }
    const legacyError = error instanceof Error ? error : new Error(String(error));
    return createLaunchBubbleTmuxSessionAckResolution({
      failureKind: "tmux_command_failed",
      errorMessage: legacyError.message,
      sessionName,
      legacyError
    });
  }
}

export const launchBubbleTmuxSession: LaunchBubbleTmuxSessionPort = async (
  input: LaunchBubbleTmuxSessionInput
): Promise<LaunchBubbleTmuxSessionResult> => {
  const { ack, legacyError } = await resolveLaunchBubbleTmuxSessionAck(input);
  if (ack.status === "running") {
    return projectRunningLaunchBubbleTmuxSessionAckToResult(ack);
  }

  if (legacyError !== undefined) {
    throw legacyError;
  }

  throw new Error(
    `${ack.reason_code}: context operation_id=launch_bubble_tmux_session bubble_id=${input.bubbleId}. ${ack.error_message}`
  );
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
