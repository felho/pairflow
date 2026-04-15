import type {
  BootstrapWorktreeWorkspacePort,
  CleanupWorktreeWorkspacePort
} from "../../shared/ports/worktreeWorkspace.js";
import type {
  LaunchBubbleTmuxSessionAckPort,
  LaunchBubbleTmuxSessionPort,
  TerminateBubbleTmuxSessionPort
} from "../../shared/ports/tmuxSessions.js";
import type {
  ReadRuntimeSessionsRegistryPort,
  ClaimRuntimeSessionPort,
  UpsertRuntimeSessionPort,
  RemoveRuntimeSessionPort
} from "../../shared/ports/runtimeSessions.js";
import type { WriteStateSnapshotPort } from "../../shared/ports/stateSnapshots.js";
import type {
  ReadReviewerBriefArtifactPort,
  ReadReviewerFocusArtifactPort
} from "../../shared/ports/reviewerArtifacts.js";
import type {
  ResolveReviewerTestExecutionDirectivePort
} from "../../shared/ports/reviewerTestEvidenceArtifacts.js";
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
  workspacePath: string;
  worktreePath: string;
  command: string;
}

export interface StartBubbleDependencies {
  bootstrapWorktreeWorkspace?: BootstrapWorktreeWorkspacePort;
  cleanupWorktreeWorkspace?: CleanupWorktreeWorkspacePort;
  runWorktreeBootstrapCommand?:
    | ((input: RunWorktreeBootstrapCommandInput) => Promise<void>)
    | undefined;
  launchBubbleTmuxSessionAck?: LaunchBubbleTmuxSessionAckPort;
  launchBubbleTmuxSession?: LaunchBubbleTmuxSessionPort;
  terminateBubbleTmuxSession?: TerminateBubbleTmuxSessionPort;
  isTmuxSessionAlive?: ((sessionName: string) => Promise<boolean>) | undefined;
  readRuntimeSessionsRegistry?: ReadRuntimeSessionsRegistryPort;
  claimRuntimeSession?: ClaimRuntimeSessionPort;
  upsertRuntimeSession?: UpsertRuntimeSessionPort;
  removeRuntimeSession?: RemoveRuntimeSessionPort;
  writeStateSnapshot?: WriteStateSnapshotPort;
  buildResumeTranscriptSummary?: typeof buildResumeTranscriptSummary;
  readReviewerBriefArtifact?: ReadReviewerBriefArtifactPort;
  readReviewerFocusArtifact?: ReadReviewerFocusArtifactPort;
  resolveReviewerTestExecutionDirective?: ResolveReviewerTestExecutionDirectivePort;
}
