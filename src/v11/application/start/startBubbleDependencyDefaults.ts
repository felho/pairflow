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
  TmuxRunner,
  TerminateBubbleTmuxSessionPort
} from "../../ports/tmuxSessions.js";
import type {
  ReadRuntimeSessionsRegistryPort,
  ClaimRuntimeSessionPort,
  UpsertRuntimeSessionPort,
  RemoveRuntimeSessionPort
} from "../../ports/runtimeSessions.js";
import type {
  EnsureBubbleInstanceIdForMutationPort
} from "../../ports/bubbleIdentity.js";
import type { ResolveBubbleByIdPort } from "../../ports/bubbleLookup.js";
import type {
  InspectedStateSnapshot,
  ReadStateSnapshotPort,
  WriteStateSnapshotPort
} from "../../ports/stateSnapshots.js";
import type {
  AppendProtocolEnvelopePort,
  ReadTranscriptEnvelopesPort
} from "../../ports/transcript.js";
import type { RunGitPort } from "../../ports/git.js";
import type { ResolveRemoteBubbleStatusTargetPort } from "../../shared/remote/commitRemoteExecution.js";
import type {
  EnsureReviewerPolicySnapshotPort,
  ReadReviewerBriefArtifactPort,
  ReadReviewerFocusArtifactPort
} from "../../ports/reviewerArtifacts.js";
import type {
  ResolveDocContractGateArtifactPathPort
} from "../../ports/docContractGateArtifacts.js";
import type {
  ResolveReviewerTestExecutionDirectivePort
} from "../../ports/reviewerTestEvidenceArtifacts.js";
import type {
  PrepareRemoteStartControlFilesPort
} from "../../ports/remoteStartControlFiles.js";
import type {
  ResolveBubbleFromWorkspaceCwdPort
} from "../../ports/workspaceResolution.js";

interface ExecuteRemoteBubbleStartInput {
  bubbleId: string;
  repoPath: string;
  bubblePaths: BubblePaths;
  bubbleConfig: BubbleConfig;
  remoteTarget: {
    alias: string;
    host: string;
    user?: string;
    repoBase: string;
    pairflowCommand: string;
    pairflowSyncCommand?: string;
    portForwards?: number[];
  };
  originUrl: string;
  remoteClonePath: string;
  controlFiles: Array<{
    relativePath: string;
    content: string;
  }>;
}

interface ExecuteRemoteBubbleStartResult {
  remoteClonePath: string;
  tmuxSessionName: string;
  startedAt: string;
  instanceId: string;
  remoteState: BubbleRemoteStateCache;
  warnings?: string[];
}

export interface StartBubbleDependencyDefaults {
  bootstrapWorktreeWorkspace: BootstrapWorktreeWorkspacePort;
  cleanupWorktreeWorkspace: CleanupWorktreeWorkspacePort;
  launchBubbleSessionAck: LaunchBubbleSessionAckPort;
  terminateBubbleTmuxSession: TerminateBubbleTmuxSessionPort;
  readRuntimeSessionsRegistry: ReadRuntimeSessionsRegistryPort;
  claimRuntimeSession: ClaimRuntimeSessionPort;
  upsertRuntimeSession: UpsertRuntimeSessionPort;
  removeRuntimeSession: RemoveRuntimeSessionPort;
  ensureBubbleInstanceIdForMutation: EnsureBubbleInstanceIdForMutationPort;
  resolveBubbleById: ResolveBubbleByIdPort;
  inspectStateSnapshot: (statePath: string) => Promise<InspectedStateSnapshot>;
  readStateSnapshot: ReadStateSnapshotPort;
  writeStateSnapshot: WriteStateSnapshotPort;
  appendProtocolEnvelope: AppendProtocolEnvelopePort;
  readTranscriptEnvelopes: ReadTranscriptEnvelopesPort;
  loadPairflowGlobalConfig: () => Promise<PairflowGlobalConfig>;
  runGitCommand: RunGitPort;
  readRemotePointer: (path: string) => Promise<BubbleRemotePointer | null>;
  resolveRemoteBubbleStatusTarget: ResolveRemoteBubbleStatusTargetPort;
  writeRemotePointer: (
    path: string,
    value: BubbleRemotePointer
  ) => Promise<void>;
  writeRemoteStateCache: (
    path: string,
    value: BubbleRemoteStateCache
  ) => Promise<void>;
  removeRemoteStateCache: (path: string) => Promise<void>;
  executeRemoteBubbleStart: (
    input: ExecuteRemoteBubbleStartInput
  ) => Promise<ExecuteRemoteBubbleStartResult>;
  prepareRemoteStartControlFiles: PrepareRemoteStartControlFilesPort;
  runTmux: TmuxRunner;
  ensureReviewerPolicySnapshot: EnsureReviewerPolicySnapshotPort;
  readReviewerBriefArtifact: ReadReviewerBriefArtifactPort;
  readReviewerFocusArtifact: ReadReviewerFocusArtifactPort;
  resolveDocContractGateArtifactPath: ResolveDocContractGateArtifactPathPort;
  resolveBubbleFromWorkspaceCwd: ResolveBubbleFromWorkspaceCwdPort;
  resolveReviewerTestExecutionDirective: ResolveReviewerTestExecutionDirectivePort;
}

let configuredStartBubbleDependencyDefaults:
  | StartBubbleDependencyDefaults
  | undefined;

export function configureStartBubbleDependencyDefaults(
  defaults: StartBubbleDependencyDefaults
): void {
  configuredStartBubbleDependencyDefaults = defaults;
}

export function loadStartBubbleDependencyDefaults():
  StartBubbleDependencyDefaults {
  if (configuredStartBubbleDependencyDefaults === undefined) {
    throw new Error(
      "START_DEFAULTS_UNCONFIGURED: start runtime defaults were not configured by the composition root. context={\"route\":\"startBubbleDependencyDefaults\"}"
    );
  }
  return configuredStartBubbleDependencyDefaults;
}
