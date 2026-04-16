import type { PairflowGlobalConfig } from "../../../config/pairflowConfig.js";
import type {
  BubbleConfig,
  BubbleRemotePointer,
  BubbleRemoteStateCache
} from "../../../types/bubble.js";
import type { BubblePaths } from "../../shared/bubble/bubblePaths.js";
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
import type { RunGitPort } from "../../shared/ports/git.js";
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
  executionTarget: "local" | "remote";
  runtimeWorkspacePath: string;
}

export interface RunWorktreeBootstrapCommandInput {
  bubbleId: string;
  workspacePath: string;
  worktreePath: string;
  command: string;
}

export interface RemoteBubbleExecutionTarget {
  alias: string;
  host: string;
  user?: string;
  repoBase: string;
  pairflowCommand: string;
  pairflowSyncCommand?: string;
  portForwards?: number[];
}

export interface RemoteStartControlFile {
  relativePath: string;
  content: string;
}

export interface ExecuteRemoteBubbleStartInput {
  bubbleId: string;
  repoPath: string;
  bubblePaths: BubblePaths;
  bubbleConfig: BubbleConfig;
  remoteTarget: RemoteBubbleExecutionTarget;
  originUrl: string;
  remoteClonePath: string;
  controlFiles: RemoteStartControlFile[];
}

export interface ExecuteRemoteBubbleStartResult {
  remoteClonePath: string;
  tmuxSessionName: string;
  startedAt: string;
  instanceId: string;
  remoteState: BubbleRemoteStateCache;
  warnings?: string[];
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
  loadPairflowGlobalConfig?: () => Promise<PairflowGlobalConfig>;
  runGitCommand?: RunGitPort;
  readRemotePointer?: (path: string) => Promise<BubbleRemotePointer | null>;
  writeRemotePointer?: (path: string, value: BubbleRemotePointer) => Promise<void>;
  writeRemoteStateCache?: (
    path: string,
    value: BubbleRemoteStateCache
  ) => Promise<void>;
  removeRemoteStateCache?: ((path: string) => Promise<void>) | undefined;
  executeRemoteBubbleStart?:
    | ((input: ExecuteRemoteBubbleStartInput) => Promise<ExecuteRemoteBubbleStartResult>)
    | undefined;
  reportWarning?: ((message: string) => void) | undefined;
}
