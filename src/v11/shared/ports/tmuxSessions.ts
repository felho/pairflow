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

export interface LaunchBubbleTmuxSessionInput {
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
  runner?: TmuxRunner;
}

export type LaunchBubbleTmuxSessionAckStatus = "running" | "failed_to_start";

export type LaunchBubbleTmuxSessionAckReasonCode =
  | "LAUNCH_ACK_WORKSPACE_REQUIRED"
  | "LAUNCH_ACK_SESSION_EXISTS"
  | "LAUNCH_ACK_TMUX_COMMAND_FAILED";

export type LaunchBubbleTmuxSessionAckFailureKind =
  | "workspace_required"
  | "session_exists"
  | "tmux_command_failed";

export interface RunningLaunchBubbleTmuxSessionAck {
  status: "running";
  sessionName: string;
  reason_code?: never;
  failure_kind?: never;
  error_message?: never;
}

export interface WorkspaceRequiredLaunchBubbleTmuxSessionAck {
  status: "failed_to_start";
  reason_code: "LAUNCH_ACK_WORKSPACE_REQUIRED";
  failure_kind: "workspace_required";
  error_message: string;
  sessionName?: never;
}

export interface SessionExistsLaunchBubbleTmuxSessionAck {
  status: "failed_to_start";
  reason_code: "LAUNCH_ACK_SESSION_EXISTS";
  failure_kind: "session_exists";
  error_message: string;
  sessionName: string;
}

export interface TmuxCommandFailedLaunchBubbleTmuxSessionAck {
  status: "failed_to_start";
  reason_code: "LAUNCH_ACK_TMUX_COMMAND_FAILED";
  failure_kind: "tmux_command_failed";
  error_message: string;
  sessionName: string;
}

export type LaunchBubbleTmuxSessionAck =
  | RunningLaunchBubbleTmuxSessionAck
  | WorkspaceRequiredLaunchBubbleTmuxSessionAck
  | SessionExistsLaunchBubbleTmuxSessionAck
  | TmuxCommandFailedLaunchBubbleTmuxSessionAck;

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

export type LaunchBubbleTmuxSessionAckPort = (
  input: LaunchBubbleTmuxSessionInput
) => Promise<LaunchBubbleTmuxSessionAck>;

export type LaunchBubbleTmuxSessionPort = (
  input: LaunchBubbleTmuxSessionInput
) => Promise<LaunchBubbleTmuxSessionResult>;

export type TerminateBubbleTmuxSessionPort = (
  input: TerminateBubbleTmuxSessionInput
) => Promise<TerminateBubbleTmuxSessionResult>;
