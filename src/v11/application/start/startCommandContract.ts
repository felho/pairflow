import type { PairflowGlobalConfig } from "../../../config/pairflowConfig.js";
import type {
  BubbleRemotePointer
} from "../../shared/remote/remoteExecutionTypes.js";
import type { BubbleConfig } from "../../shared/config/bubbleConfigTypes.js";
import type { BubbleRemoteStateCache } from "../../shared/remote/remoteStateCacheTypes.js";
import type { BubblePaths } from "../../shared/bubble/bubblePaths.js";
import type {
  BootstrapWorktreeWorkspacePort,
  CleanupWorktreeWorkspacePort
} from "../../ports/worktreeWorkspace.js";
import type {
  LaunchBubbleSessionAckPort,
  TerminateBubbleTmuxSessionPort
} from "../../ports/tmuxSessions.js";
import type {
  ReadRuntimeSessionsRegistryPort,
  ClaimRuntimeSessionPort,
  UpsertRuntimeSessionPort,
  RemoveRuntimeSessionPort
} from "../../ports/runtimeSessions.js";
import type { WriteStateSnapshotPort } from "../../ports/stateSnapshots.js";
import type {
  ResolveDocContractGateArtifactPathPort
} from "../../ports/docContractGateArtifacts.js";
import type {
  ReadReviewerBriefArtifactPort,
  ReadReviewerFocusArtifactPort
} from "../../ports/reviewerArtifacts.js";
import type {
  ResolveReviewerTestExecutionDirectivePort
} from "../../ports/reviewerTestEvidenceArtifacts.js";
import type { RunGitPort } from "../../ports/git.js";
import type { ProcessSpawnPort } from "../../ports/processSpawn.js";
import type { buildResumeTranscriptSummary } from "./internal/prompts/startCommandResumeSummary.js";
import type { BubbleStateSnapshot } from "../../domain/state/snapshot/bubbleStateSnapshot.js";

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
  processSpawn?: ProcessSpawnPort;
  bootstrapWorktreeWorkspace?: BootstrapWorktreeWorkspacePort;
  cleanupWorktreeWorkspace?: CleanupWorktreeWorkspacePort;
  runWorktreeBootstrapCommand?:
    | ((input: RunWorktreeBootstrapCommandInput) => Promise<void>)
    | undefined;
  launchBubbleSessionAck?: LaunchBubbleSessionAckPort;
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
  resolveDocContractGateArtifactPath?: ResolveDocContractGateArtifactPathPort;
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
