import { loadPairflowGlobalConfig as loadPairflowGlobalConfigCanonical } from "../../../config/pairflowConfig.js";
import {
  ensureBubbleInstanceIdForMutation
} from "../bubbleIdentity/bubbleIdentityDefaults.js";
import {
  resolveBubbleById
} from "../bubbleLookup/bubbleLookupDefaults.js";
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
import { resolveRemoteBubbleStatusTarget as resolveRemoteBubbleStatusTargetCanonical } from "../../infrastructure/executor/ssh/sshBubbleStatus.js";
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
import {
  inspectStateSnapshot,
  readStateSnapshot
} from "../state/stateStoreDefaults.js";
import {
  appendProtocolEnvelope,
  readTranscriptEnvelopes
} from "../transcript/transcriptDependencyDefaults.js";
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
  BubbleRemotePointer
} from "../../shared/remote/remoteExecutionTypes.js";
import type {
  BubbleRemoteStateCache
} from "../../../types/bubble.js";
import type { PairflowGlobalConfig } from "../../../config/pairflowConfig.js";
import type {
  BootstrapWorktreeWorkspacePort,
  CleanupWorktreeWorkspacePort
} from "../../ports/worktreeWorkspace.js";
import type {
  ReadRuntimeSessionsRegistryPort,
  ClaimRuntimeSessionPort,
  UpsertRuntimeSessionPort,
  RemoveRuntimeSessionPort
} from "../../ports/runtimeSessions.js";
import type {
  LaunchBubbleSessionAckPort,
  TmuxRunner,
  TerminateBubbleTmuxSessionPort
} from "../../ports/tmuxSessions.js";
import type { RunGitPort } from "../../ports/git.js";
import type {
  InspectedStateSnapshot,
  ReadStateSnapshotPort,
  WriteStateSnapshotPort
} from "../../ports/stateSnapshots.js";
import type {
  AppendProtocolEnvelopePort,
  ReadTranscriptEnvelopesPort
} from "../../ports/transcript.js";
import type {
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
  ResolveBubbleFromWorkspaceCwdPort
} from "../../ports/workspaceResolution.js";
import type {
  EnsureBubbleInstanceIdForMutationPort
} from "../../ports/bubbleIdentity.js";
import type { ResolveBubbleByIdPort } from "../../ports/bubbleLookup.js";
import type { ResolveRemoteBubbleStatusTargetPort } from "../../shared/remote/commitRemoteExecution.js";
import { configureStartBubbleDependencyDefaults } from "../../application/start/startBubbleDependencyDefaults.js";

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
  ensureBubbleInstanceIdForMutation,
  resolveBubbleById,
  inspectStateSnapshot,
  readStateSnapshot,
  writeStateSnapshot: writeStateSnapshotCanonical,
  appendProtocolEnvelope,
  readTranscriptEnvelopes,
  loadPairflowGlobalConfig: loadPairflowGlobalConfigCanonical,
  runGitCommand: runGitCommandCanonical,
  readRemotePointer: readRemotePointerCanonical,
  resolveRemoteBubbleStatusTarget: resolveRemoteBubbleStatusTargetCanonical,
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

configureStartBubbleDependencyDefaults(startBubbleDependencyDefaults);
