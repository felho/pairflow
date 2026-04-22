export interface TmuxRunResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

export interface TmuxRunOptions {
  cwd?: string;
  allowFailure?: boolean;
}

export const runtimePaneIndices = {
  status: 0,
  implementer: 1,
  reviewer: 2,
  metaReviewer: 3
} as const;

export type TmuxRunner = (
  args: string[],
  options?: TmuxRunOptions
) => Promise<TmuxRunResult>;

type TmuxCommandRunner = TmuxRunner;

export interface LaunchBubbleSessionInput {
  bubbleId: string;
  workspacePath: string;
  statusCommand: string;
  implementerCommand: string;
  reviewerCommand: string;
  metaReviewerCommand?: string;
  statusPaneLabel?: string;
  implementerPaneLabel?: string;
  reviewerPaneLabel?: string;
  metaReviewerPaneLabel?: string;
  implementerBootstrapMessage?: string;
  reviewerBootstrapMessage?: string;
  metaReviewerBootstrapMessage?: string;
  implementerSubmitStartupPrompt?: boolean;
  reviewerSubmitStartupPrompt?: boolean;
  metaReviewerSubmitStartupPrompt?: boolean;
  implementerKickoffMessage?: string;
  reviewerKickoffMessage?: string;
  metaReviewerKickoffMessage?: string;
}

export interface LaunchBubbleTmuxSessionInput extends LaunchBubbleSessionInput {
  // Temporary compat-only seam until O2-T13 removes the retained tmux wrappers.
  runner?: TmuxCommandRunner;
}

export type LaunchBubbleSessionAckStatus = "running" | "failed_to_start";

export type LaunchBubbleTmuxSessionAckStatus = LaunchBubbleSessionAckStatus;

export type LaunchBubbleSessionAckReasonCode =
  | "LAUNCH_ACK_WORKSPACE_REQUIRED"
  | "LAUNCH_ACK_SESSION_EXISTS"
  | "LAUNCH_ACK_COMMAND_FAILED";

export type LaunchBubbleTmuxSessionAckReasonCode = LaunchBubbleSessionAckReasonCode;

export type LaunchBubbleSessionAckFailureKind =
  | "workspace_required"
  | "session_exists"
  | "command_failed";

export type LaunchBubbleTmuxSessionAckFailureKind =
  LaunchBubbleSessionAckFailureKind;

export interface RunningLaunchBubbleSessionAck {
  status: "running";
  sessionName: string;
  reason_code?: never;
  failure_kind?: never;
  error_message?: never;
}

export type RunningLaunchBubbleTmuxSessionAck = RunningLaunchBubbleSessionAck;

export interface WorkspaceRequiredLaunchBubbleSessionAck {
  status: "failed_to_start";
  reason_code: "LAUNCH_ACK_WORKSPACE_REQUIRED";
  failure_kind: "workspace_required";
  error_message: string;
  sessionName?: never;
}

export type WorkspaceRequiredLaunchBubbleTmuxSessionAck =
  WorkspaceRequiredLaunchBubbleSessionAck;

export interface SessionExistsLaunchBubbleSessionAck {
  status: "failed_to_start";
  reason_code: "LAUNCH_ACK_SESSION_EXISTS";
  failure_kind: "session_exists";
  error_message: string;
  sessionName: string;
}

export type SessionExistsLaunchBubbleTmuxSessionAck =
  SessionExistsLaunchBubbleSessionAck;

export interface CommandFailedLaunchBubbleSessionAck {
  status: "failed_to_start";
  reason_code: "LAUNCH_ACK_COMMAND_FAILED";
  failure_kind: "command_failed";
  error_message: string;
  sessionName: string;
}

export type CommandFailedLaunchBubbleTmuxSessionAck =
  CommandFailedLaunchBubbleSessionAck;

export type LaunchBubbleSessionAck =
  | RunningLaunchBubbleSessionAck
  | WorkspaceRequiredLaunchBubbleSessionAck
  | SessionExistsLaunchBubbleSessionAck
  | CommandFailedLaunchBubbleSessionAck;

export type LaunchBubbleTmuxSessionAck = LaunchBubbleSessionAck;

export interface LaunchBubbleTmuxSessionResult {
  sessionName: string;
}

export interface TerminateBubbleTmuxSessionInput {
  bubbleId?: string;
  sessionName?: string;
  runner?: TmuxCommandRunner;
}

export interface TerminateBubbleTmuxSessionResult {
  sessionName: string;
  existed: boolean;
}

export type LaunchBubbleSessionAckPort = (
  input: LaunchBubbleSessionInput
) => Promise<LaunchBubbleSessionAck>;

export type LaunchBubbleTmuxSessionAckPort = (
  input: LaunchBubbleTmuxSessionInput
) => Promise<LaunchBubbleTmuxSessionAck>;

export type LaunchBubbleTmuxSessionPort = (
  input: LaunchBubbleTmuxSessionInput
) => Promise<LaunchBubbleTmuxSessionResult>;

export type TerminateBubbleTmuxSessionPort = (
  input: TerminateBubbleTmuxSessionInput
) => Promise<TerminateBubbleTmuxSessionResult>;
