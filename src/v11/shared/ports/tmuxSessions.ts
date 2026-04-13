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

export type LaunchBubbleTmuxSessionPort = (
  input: LaunchBubbleTmuxSessionInput
) => Promise<LaunchBubbleTmuxSessionResult>;

export type TerminateBubbleTmuxSessionPort = (
  input: TerminateBubbleTmuxSessionInput
) => Promise<TerminateBubbleTmuxSessionResult>;
