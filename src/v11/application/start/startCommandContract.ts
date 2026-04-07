import type {
  BootstrapWorktreeWorkspacePort,
  CleanupWorktreeWorkspacePort
} from "../../shared/ports/worktreeWorkspace.js";
import type {
  LaunchBubbleTmuxSessionPort,
  TerminateBubbleTmuxSessionPort
} from "../../shared/ports/tmuxSessions.js";
import type {
  ClaimRuntimeSessionPort,
  RemoveRuntimeSessionPort
} from "../../shared/ports/runtimeSessions.js";
import type { buildResumeTranscriptSummary } from "./startCommandResumeSummary.js";
import type { BubbleStateSnapshot } from "../../../types/bubble.js";

export interface StartBubbleInput {
  bubbleId: string;
  repoPath?: string | undefined;
  cwd?: string | undefined;
  now?: Date | undefined;
}

export interface StartBubbleResult {
  bubbleId: string;
  state: BubbleStateSnapshot;
  tmuxSessionName: string;
  worktreePath: string;
}

export interface RunWorktreeBootstrapCommandInput {
  bubbleId: string;
  worktreePath: string;
  command: string;
}

export interface StartBubbleDependencies {
  bootstrapWorktreeWorkspace?: BootstrapWorktreeWorkspacePort;
  cleanupWorktreeWorkspace?: CleanupWorktreeWorkspacePort;
  runWorktreeBootstrapCommand?:
    | ((input: RunWorktreeBootstrapCommandInput) => Promise<void>)
    | undefined;
  launchBubbleTmuxSession?: LaunchBubbleTmuxSessionPort;
  terminateBubbleTmuxSession?: TerminateBubbleTmuxSessionPort;
  isTmuxSessionAlive?: ((sessionName: string) => Promise<boolean>) | undefined;
  claimRuntimeSession?: ClaimRuntimeSessionPort;
  removeRuntimeSession?: RemoveRuntimeSessionPort;
  buildResumeTranscriptSummary?: typeof buildResumeTranscriptSummary;
}
