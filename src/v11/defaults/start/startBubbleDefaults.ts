import { loadPairflowGlobalConfig as loadPairflowGlobalConfigCanonical } from "../../../config/pairflowConfig.js";
import {
  terminateBubbleTmuxSession as terminateBubbleTmuxSessionCanonical,
  launchBubbleTmuxSessionAck as launchBubbleTmuxSessionAckCanonical,
  launchBubbleTmuxSession as launchBubbleTmuxSessionCanonical
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
  LaunchBubbleTmuxSessionAckPort,
  LaunchBubbleTmuxSessionPort,
  TerminateBubbleTmuxSessionPort
} from "../../shared/ports/tmuxSessions.js";
import type { RunGitPort } from "../../shared/ports/git.js";
import type { WriteStateSnapshotPort } from "../../shared/ports/stateSnapshots.js";

export interface StartBubbleDependencyDefaults {
  bootstrapWorktreeWorkspace: BootstrapWorktreeWorkspacePort;
  cleanupWorktreeWorkspace: CleanupWorktreeWorkspacePort;
  launchBubbleTmuxSessionAck: LaunchBubbleTmuxSessionAckPort;
  launchBubbleTmuxSession: LaunchBubbleTmuxSessionPort;
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
}

export const bootstrapWorktreeWorkspace: BootstrapWorktreeWorkspacePort =
  bootstrapWorktreeWorkspaceCanonical;

export const launchBubbleTmuxSession: LaunchBubbleTmuxSessionPort =
  launchBubbleTmuxSessionCanonical;

export const launchBubbleTmuxSessionAck: LaunchBubbleTmuxSessionAckPort =
  launchBubbleTmuxSessionAckCanonical;

export const claimRuntimeSession: ClaimRuntimeSessionPort =
  claimRuntimeSessionCanonical;

export const readRuntimeSessionsRegistry: ReadRuntimeSessionsRegistryPort =
  readRuntimeSessionsRegistryCanonical;

export const upsertRuntimeSession: UpsertRuntimeSessionPort =
  upsertRuntimeSessionCanonical;

export const startBubbleDependencyDefaults: StartBubbleDependencyDefaults = {
  bootstrapWorktreeWorkspace,
  cleanupWorktreeWorkspace: cleanupWorktreeWorkspaceCanonical,
  launchBubbleTmuxSessionAck,
  launchBubbleTmuxSession,
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
  executeRemoteBubbleStart: executeRemoteBubbleStartCanonical
};
