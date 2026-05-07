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
  LaunchBubbleSessionAckPort,
  TmuxRunner,
  TerminateBubbleTmuxSessionPort
} from "../../shared/ports/tmuxSessions.js";
import type {
  ReadRuntimeSessionsRegistryPort,
  ClaimRuntimeSessionPort,
  UpsertRuntimeSessionPort,
  RemoveRuntimeSessionPort
} from "../../shared/ports/runtimeSessions.js";
import type {
  EnsureBubbleInstanceIdForMutationPort
} from "../../shared/ports/bubbleIdentity.js";
import type { WriteStateSnapshotPort } from "../../shared/ports/stateSnapshots.js";
import type { RunGitPort } from "../../shared/ports/git.js";
import type {
  ReadReviewerBriefArtifactPort,
  ReadReviewerFocusArtifactPort
} from "../../shared/ports/reviewerArtifacts.js";
import type {
  ResolveDocContractGateArtifactPathPort
} from "../../shared/ports/docContractGateArtifacts.js";
import type {
  ResolveReviewerTestExecutionDirectivePort
} from "../../shared/ports/reviewerTestEvidenceArtifacts.js";
import type {
  ResolveBubbleFromWorkspaceCwdPort
} from "../../shared/ports/workspaceResolution.js";

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
  writeStateSnapshot: WriteStateSnapshotPort;
  loadPairflowGlobalConfig: () => Promise<PairflowGlobalConfig>;
  runGitCommand: RunGitPort;
  readRemotePointer: (path: string) => Promise<BubbleRemotePointer | null>;
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
  runTmux: TmuxRunner;
  readReviewerBriefArtifact: ReadReviewerBriefArtifactPort;
  readReviewerFocusArtifact: ReadReviewerFocusArtifactPort;
  resolveDocContractGateArtifactPath: ResolveDocContractGateArtifactPathPort;
  resolveBubbleFromWorkspaceCwd: ResolveBubbleFromWorkspaceCwdPort;
  resolveReviewerTestExecutionDirective: ResolveReviewerTestExecutionDirectivePort;
}

interface StartBubbleDependencyDefaultsModule {
  startBubbleDependencyDefaults: StartBubbleDependencyDefaults;
}

let startBubbleDependencyDefaultsPromise:
  | Promise<StartBubbleDependencyDefaults>
  | undefined;

function getStartBubbleDependencyDefaultsModulePath(): string {
  return "../../defaults/start/startBubbleDefaults.js";
}

export async function loadStartBubbleDependencyDefaults():
  Promise<StartBubbleDependencyDefaults> {
  startBubbleDependencyDefaultsPromise ??= import(
    getStartBubbleDependencyDefaultsModulePath()
  ).then(
    (module) =>
      (module as StartBubbleDependencyDefaultsModule).startBubbleDependencyDefaults
  );
  return startBubbleDependencyDefaultsPromise;
}
