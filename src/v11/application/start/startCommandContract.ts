import type {
  bootstrapWorktreeWorkspace,
  cleanupWorktreeWorkspace
} from "../../../core/workspace/worktreeManager.js";
import type {
  launchBubbleTmuxSession,
  terminateBubbleTmuxSession
} from "../../infrastructure/channel/tmux/tmuxManager.js";
import type {
  claimRuntimeSession,
  removeRuntimeSession
} from "../../infrastructure/executor/sessionRuntime/runtimeSessionsRegistry.js";
import type { buildResumeTranscriptSummary } from "../../shared/protocol/resumeSummary.js";
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
  bootstrapWorktreeWorkspace?: typeof bootstrapWorktreeWorkspace;
  cleanupWorktreeWorkspace?: typeof cleanupWorktreeWorkspace;
  runWorktreeBootstrapCommand?:
    | ((input: RunWorktreeBootstrapCommandInput) => Promise<void>)
    | undefined;
  launchBubbleTmuxSession?: typeof launchBubbleTmuxSession;
  terminateBubbleTmuxSession?: typeof terminateBubbleTmuxSession;
  isTmuxSessionAlive?: ((sessionName: string) => Promise<boolean>) | undefined;
  claimRuntimeSession?: typeof claimRuntimeSession;
  removeRuntimeSession?: typeof removeRuntimeSession;
  buildResumeTranscriptSummary?: typeof buildResumeTranscriptSummary;
}
