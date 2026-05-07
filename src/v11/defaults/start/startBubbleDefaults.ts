import { loadPairflowGlobalConfig as loadPairflowGlobalConfigCanonical } from "../../../config/pairflowConfig.js";
import {
  terminateBubbleTmuxSession as terminateBubbleTmuxSessionCanonical,
  launchBubbleSessionAck as launchBubbleSessionAckCanonical
} from "../../infrastructure/channel/tmux/tmuxManager.js";
import {
  readRemotePointer as readRemotePointerCanonical,
  removeRemoteStateCache as removeRemoteStateCacheCanonical,
  writeRemotePointer as writeRemotePointerCanonical,
  writeRemoteStateCache as writeRemoteStateCacheCanonical
} from "../../infrastructure/artifact/bubble/remoteExecutionArtifacts.js";
import { executeRemoteBubbleStart as executeRemoteBubbleStartCanonical } from "../../infrastructure/executor/ssh/sshBubbleStart.js";
import {
  readRuntimeSessionsRegistry as readRuntimeSessionsRegistryCanonical,
  claimRuntimeSession as claimRuntimeSessionCanonical,
  upsertRuntimeSession as upsertRuntimeSessionCanonical,
  removeRuntimeSession as removeRuntimeSessionCanonical
} from "../../infrastructure/executor/sessionRuntime/runtimeSessionsRegistry.js";
import {
  readReviewerBriefArtifact,
  readReviewerFocusArtifact
} from "../reviewer/reviewerArtifactDefaults.js";
import {
  resolveDocContractGateArtifactPath
} from "../gates/docContractGateArtifactDefaults.js";
import {
  resolveReviewerTestExecutionDirective
} from "../reviewer/reviewerTestEvidenceDefaults.js";
import { runTmux } from "../tmux/tmuxRunnerDefaults.js";
import { resolveBubbleFromWorkspaceCwd } from "../workspace/workspaceResolutionDefaults.js";
import {
  cleanupWorktreeWorkspace as cleanupWorktreeWorkspaceCanonical,
  bootstrapWorktreeWorkspace as bootstrapWorktreeWorkspaceCanonical
} from "../../infrastructure/workspace/worktreeManager.js";
import { runGit as runGitCommandCanonical } from "../../infrastructure/workspace/git.js";
import { writeStateSnapshot as writeStateSnapshotCanonical } from "../../infrastructure/state/stateStore.js";
import type {
  ExecuteRemoteBubbleStartInput,
  ExecuteRemoteBubbleStartResult
} from "../../application/start/startCommandContract.js";
import type {
  BubbleRemotePointer,
  BubbleRemoteStateCache
} from "../../../types/bubble.js";
import type { PairflowGlobalConfig } from "../../../config/pairflowConfig.js";
import type {
  BootstrapWorktreeWorkspacePort,
  CleanupWorktreeWorkspacePort
} from "../../shared/ports/worktreeWorkspace.js";
import type {
  ReadRuntimeSessionsRegistryPort,
  ClaimRuntimeSessionPort,
  UpsertRuntimeSessionPort,
  RemoveRuntimeSessionPort
} from "../../shared/ports/runtimeSessions.js";
import type {
  LaunchBubbleSessionAckPort,
  TmuxRunner,
  TerminateBubbleTmuxSessionPort
} from "../../shared/ports/tmuxSessions.js";
import type { RunGitPort } from "../../shared/ports/git.js";
import type { WriteStateSnapshotPort } from "../../shared/ports/stateSnapshots.js";
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

export interface StartBubbleDependencyDefaults {
  bootstrapWorktreeWorkspace: BootstrapWorktreeWorkspacePort;
  cleanupWorktreeWorkspace: CleanupWorktreeWorkspacePort;
  launchBubbleSessionAck: LaunchBubbleSessionAckPort;
  terminateBubbleTmuxSession: TerminateBubbleTmuxSessionPort;
  readRuntimeSessionsRegistry: ReadRuntimeSessionsRegistryPort;
  claimRuntimeSession: ClaimRuntimeSessionPort;
  upsertRuntimeSession: UpsertRuntimeSessionPort;
  removeRuntimeSession: RemoveRuntimeSessionPort;
  writeStateSnapshot: WriteStateSnapshotPort;
  loadPairflowGlobalConfig: () => Promise<PairflowGlobalConfig>;
  runGitCommand: RunGitPort;
  readRemotePointer: (path: string) => Promise<BubbleRemotePointer | null>;
  writeRemotePointer: (path: string, value: BubbleRemotePointer) => Promise<void>;
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
  resolveReviewerTestExecutionDirective:
    ResolveReviewerTestExecutionDirectivePort;
}

export const bootstrapWorktreeWorkspace: BootstrapWorktreeWorkspacePort =
  bootstrapWorktreeWorkspaceCanonical;

export const launchBubbleSessionAck: LaunchBubbleSessionAckPort =
  launchBubbleSessionAckCanonical;

export const claimRuntimeSession: ClaimRuntimeSessionPort =
  claimRuntimeSessionCanonical;

export const readRuntimeSessionsRegistry: ReadRuntimeSessionsRegistryPort =
  readRuntimeSessionsRegistryCanonical;

export const upsertRuntimeSession: UpsertRuntimeSessionPort =
  upsertRuntimeSessionCanonical;

export const startBubbleDependencyDefaults: StartBubbleDependencyDefaults = {
  bootstrapWorktreeWorkspace,
  cleanupWorktreeWorkspace: cleanupWorktreeWorkspaceCanonical,
  launchBubbleSessionAck,
  terminateBubbleTmuxSession: terminateBubbleTmuxSessionCanonical,
  readRuntimeSessionsRegistry,
  claimRuntimeSession,
  upsertRuntimeSession,
  removeRuntimeSession: removeRuntimeSessionCanonical,
  writeStateSnapshot: writeStateSnapshotCanonical,
  loadPairflowGlobalConfig: loadPairflowGlobalConfigCanonical,
  runGitCommand: runGitCommandCanonical,
  readRemotePointer: readRemotePointerCanonical,
  writeRemotePointer: writeRemotePointerCanonical,
  writeRemoteStateCache: writeRemoteStateCacheCanonical,
  removeRemoteStateCache: removeRemoteStateCacheCanonical,
  executeRemoteBubbleStart: executeRemoteBubbleStartCanonical,
  runTmux,
  readReviewerBriefArtifact,
  readReviewerFocusArtifact,
  resolveDocContractGateArtifactPath,
  resolveBubbleFromWorkspaceCwd,
  resolveReviewerTestExecutionDirective
};
