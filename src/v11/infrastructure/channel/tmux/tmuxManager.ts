import { buildBubbleTmuxSessionName } from "../../../shared/bubble/tmuxSessionName.js";
import type {
  LaunchBubbleSessionAck,
  LaunchBubbleSessionAckPort,
  LaunchBubbleSessionInput,
  LaunchBubbleTmuxSessionAckPort,
  LaunchBubbleTmuxSessionInput,
  LaunchBubbleTmuxSessionPort,
  LaunchBubbleTmuxSessionResult,
  TmuxRunner
} from "../../../shared/ports/tmuxSessions.js";
import {
  runTmux,
  TmuxCommandError
} from "./tmuxRunner.js";
import { launchBubbleTmuxSessionLayout } from "./tmuxManagerSessionLayout.js";
import { seedBubbleTmuxPaneMessages } from "./tmuxManagerPaneSeed.js";
import {
  respawnTmuxPaneCommand,
  terminateBubbleTmuxSession
} from "./tmuxManagerRuntime.js";

export type {
  LaunchBubbleSessionAck,
  LaunchBubbleSessionAckFailureKind,
  LaunchBubbleSessionAckPort,
  LaunchBubbleSessionAckReasonCode,
  LaunchBubbleSessionAckStatus,
  LaunchBubbleSessionInput,
  RunningLaunchBubbleSessionAck,
  WorkspaceRequiredLaunchBubbleSessionAck,
  SessionExistsLaunchBubbleSessionAck,
  CommandFailedLaunchBubbleSessionAck,
  LaunchBubbleTmuxSessionAck,
  LaunchBubbleTmuxSessionAckFailureKind,
  LaunchBubbleTmuxSessionAckPort,
  LaunchBubbleTmuxSessionAckReasonCode,
  LaunchBubbleTmuxSessionAckStatus,
  LaunchBubbleTmuxSessionInput,
  RunningLaunchBubbleTmuxSessionAck,
  WorkspaceRequiredLaunchBubbleTmuxSessionAck,
  SessionExistsLaunchBubbleTmuxSessionAck,
  CommandFailedLaunchBubbleTmuxSessionAck,
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
export type { RespawnTmuxPaneCommandInput } from "./tmuxManagerRuntime.js";

export const runtimePaneIndices = {
  status: 0,
  implementer: 1,
  reviewer: 2,
  metaReviewer: 3
} as const;

function buildStatusPaneLabel(bubbleId: string): string {
  return `[orchestrator/status]-[${bubbleId}]`;
}

function buildLaunchPanePlaceholderCommand(): string {
  return "sh -lc 'while :; do sleep 3600; done'";
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

function buildCanonicalLaunchOperationContext(bubbleId: string): string {
  return `operation_id=launch_bubble_session bubble_id=${bubbleId}`;
}

function buildLegacyTmuxLaunchOperationContext(bubbleId: string): string {
  return `operation_id=launch_bubble_tmux_session bubble_id=${bubbleId}`;
}

function buildLegacyTmuxLaunchWorkspaceRequiredMessage(bubbleId: string): string {
  return `TMUX_LAUNCH_WORKSPACE_REQUIRED: context ${buildLegacyTmuxLaunchOperationContext(bubbleId)}.`;
}

interface LaunchBubbleSessionRuntimeInput extends LaunchBubbleSessionInput {
  runner?: TmuxRunner;
}

function resolveLaunchWorkspacePath(input: {
  bubbleId: string;
  workspacePath: string;
}): string {
  const workspacePath = input.workspacePath.trim();
  if (workspacePath.length === 0) {
    throw new Error(
      `LAUNCH_WORKSPACE_REQUIRED: context ${buildCanonicalLaunchOperationContext(input.bubbleId)}.`
    );
  }
  return workspacePath;
}

function createLaunchBubbleSessionFailureAck(
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
      failureKind: "command_failed";
      errorMessage: string;
      sessionName: string;
    }
): LaunchBubbleSessionAck {
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
    case "command_failed":
      return {
        status: "failed_to_start",
        reason_code: "LAUNCH_ACK_COMMAND_FAILED",
        failure_kind: "command_failed",
        error_message: input.errorMessage,
        sessionName: input.sessionName
      };
  }
}

interface LaunchBubbleSessionAckResolution {
  ack: LaunchBubbleSessionAck;
  legacyError?: Error;
}

interface LaunchBubbleSessionRuntimeConfig {
  runner: TmuxRunner;
  sessionName: string;
  workspacePath: string;
  statusPaneHeight: number;
  tmuxPaneSeparators: number;
  metaReviewerCommand: string;
  statusPaneLabel: string;
  implementerPaneLabel: string;
  reviewerPaneLabel: string;
  metaReviewerPaneLabel: string;
  placeholderCommand: string;
}

function createLaunchBubbleSessionAckResolution(
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
      failureKind: "command_failed";
      errorMessage: string;
      sessionName: string;
      legacyError?: Error;
    }
): LaunchBubbleSessionAckResolution {
  const { legacyError, ...ackInput } = input;
  return {
    ack: createLaunchBubbleSessionFailureAck(ackInput),
    ...(legacyError !== undefined ? { legacyError } : {})
  };
}

function projectRunningLaunchBubbleSessionAckToResult(
  ack: Extract<LaunchBubbleSessionAck, { status: "running" }>
): LaunchBubbleTmuxSessionResult {
  return {
    sessionName: ack.sessionName
  };
}

function projectCanonicalLaunchAckToTmuxCompatAck(
  bubbleId: string,
  ack: LaunchBubbleSessionAck
): LaunchBubbleSessionAck {
  if (ack.failure_kind !== "workspace_required") {
    return ack;
  }

  return {
    ...ack,
    error_message: buildLegacyTmuxLaunchWorkspaceRequiredMessage(bubbleId)
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

function createWorkspaceRequiredAckResolution(
  bubbleId: string,
  error: unknown
): LaunchBubbleSessionAckResolution {
  const legacyError = new Error(
    buildLegacyTmuxLaunchWorkspaceRequiredMessage(bubbleId)
  );
  const canonicalErrorMessage =
    error instanceof Error ? error.message : new Error(String(error)).message;
  return createLaunchBubbleSessionAckResolution({
    failureKind: "workspace_required",
    errorMessage: canonicalErrorMessage,
    legacyError
  });
}

function buildLaunchBubbleSessionRuntimeConfig(
  input: LaunchBubbleSessionRuntimeInput,
  runner: TmuxRunner,
  sessionName: string,
  workspacePath: string
): LaunchBubbleSessionRuntimeConfig {
  return {
    runner,
    sessionName,
    workspacePath,
    statusPaneHeight: 13,
    tmuxPaneSeparators: 4,
    metaReviewerCommand: input.metaReviewerCommand ?? input.reviewerCommand,
    statusPaneLabel: input.statusPaneLabel ?? buildStatusPaneLabel(input.bubbleId),
    implementerPaneLabel: input.implementerPaneLabel ?? "[codex/implementer]",
    reviewerPaneLabel: input.reviewerPaneLabel ?? "[claude/reviewer]",
    metaReviewerPaneLabel:
      input.metaReviewerPaneLabel ?? "[codex/meta-reviewer]",
    placeholderCommand: buildLaunchPanePlaceholderCommand()
  };
}

async function resolveHasSessionAckFailure(
  runner: TmuxRunner,
  sessionName: string
): Promise<LaunchBubbleSessionAckResolution | null> {
  const hasSession = await runner(["has-session", "-t", sessionName], {
    allowFailure: true
  });
  if (hasSession.exitCode === 1) {
    return null;
  }
  if (hasSession.exitCode === 0) {
    const legacyError = new TmuxSessionExistsError(sessionName);
    return createLaunchBubbleSessionAckResolution({
      failureKind: "session_exists",
      errorMessage: legacyError.message,
      sessionName,
      legacyError
    });
  }

  const legacyError = new TmuxCommandError(
    ["has-session", "-t", sessionName],
    hasSession.exitCode,
    hasSession.stderr || hasSession.stdout
  );
  return createLaunchBubbleSessionAckResolution({
    failureKind: "command_failed",
    errorMessage: legacyError.message,
    sessionName,
    legacyError
  });
}

async function launchAndSeedBubbleSession(
  config: LaunchBubbleSessionRuntimeConfig,
  input: LaunchBubbleSessionRuntimeInput
): Promise<void> {
  await config.runner([
    "new-session",
    "-d",
    "-s",
    config.sessionName,
    "-c",
    config.workspacePath,
    input.statusCommand
  ]);
  const layout = await launchBubbleTmuxSessionLayout({
    runner: config.runner,
    sessionName: config.sessionName,
    workspacePath: config.workspacePath,
    statusPaneLabel: config.statusPaneLabel,
    implementerPaneLabel: config.implementerPaneLabel,
    reviewerPaneLabel: config.reviewerPaneLabel,
    metaReviewerPaneLabel: config.metaReviewerPaneLabel,
    statusPaneHeight: config.statusPaneHeight,
    tmuxPaneSeparators: config.tmuxPaneSeparators,
    placeholderCommand: config.placeholderCommand
  });
  await respawnTmuxPaneCommand({
    sessionName: config.sessionName,
    paneIndex: runtimePaneIndices.implementer,
    cwd: config.workspacePath,
    command: input.implementerCommand,
    runner: config.runner
  });
  await respawnTmuxPaneCommand({
    sessionName: config.sessionName,
    paneIndex: runtimePaneIndices.reviewer,
    cwd: config.workspacePath,
    command: input.reviewerCommand,
    runner: config.runner
  });
  await respawnTmuxPaneCommand({
    sessionName: config.sessionName,
    paneIndex: runtimePaneIndices.metaReviewer,
    cwd: config.workspacePath,
    command: config.metaReviewerCommand,
    runner: config.runner
  });
  await seedBubbleTmuxPaneMessages({
    runner: config.runner,
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
}

export const launchBubbleSessionAck: LaunchBubbleSessionAckPort = async (
  input
): Promise<LaunchBubbleSessionAck> => {
  const resolution = await resolveLaunchBubbleSessionAck(input);
  return resolution.ack;
};

export const launchBubbleTmuxSessionAck: LaunchBubbleTmuxSessionAckPort = async (
  input
) => {
  const ack = await launchBubbleSessionAck(input);
  return projectCanonicalLaunchAckToTmuxCompatAck(input.bubbleId, ack);
};

async function resolveLaunchBubbleSessionAck(
  input: LaunchBubbleSessionRuntimeInput
): Promise<LaunchBubbleSessionAckResolution> {
  const runner = input.runner ?? runTmux;
  const sessionName = buildBubbleTmuxSessionName(input.bubbleId);
  let workspacePath: string;
  try {
    workspacePath = resolveLaunchWorkspacePath(input);
  } catch (error) {
    return createWorkspaceRequiredAckResolution(input.bubbleId, error);
  }
  const runtimeConfig = buildLaunchBubbleSessionRuntimeConfig(
    input,
    runner,
    sessionName,
    workspacePath
  );

  try {
    const hasSessionFailure = await resolveHasSessionAckFailure(
      runtimeConfig.runner,
      runtimeConfig.sessionName
    );
    if (hasSessionFailure !== null) {
      return hasSessionFailure;
    }
    await launchAndSeedBubbleSession(runtimeConfig, input);

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
    return createLaunchBubbleSessionAckResolution({
      failureKind: "command_failed",
      errorMessage: legacyError.message,
      sessionName,
      legacyError
    });
  }
}

export const launchBubbleTmuxSession: LaunchBubbleTmuxSessionPort = async (
  input: LaunchBubbleTmuxSessionInput
): Promise<LaunchBubbleTmuxSessionResult> => {
  const { ack, legacyError } = await resolveLaunchBubbleSessionAck(input);
  if (ack.status === "running") {
    return projectRunningLaunchBubbleSessionAckToResult(ack);
  }

  if (legacyError !== undefined) {
    throw legacyError;
  }

  throw new Error(
    `${ack.reason_code}: context operation_id=launch_bubble_tmux_session bubble_id=${input.bubbleId}. ${ack.error_message}`
  );
};
export { terminateBubbleTmuxSession, respawnTmuxPaneCommand };
