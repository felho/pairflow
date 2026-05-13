import type {
  DeleteBubbleResult
} from "../../../contracts/deleteBubble.js";
import type {
  BubbleRemotePointerCreated,
  BubbleRemotePointerStarted
} from "../../shared/remote/remoteExecutionTypes.js";
import type {
  ArchiveIndexEntry,
  ArchiveManifest
} from "../../../types/archive.js";
import type { BranchExistsPort } from "../../ports/git.js";
import type { PathExistsPort } from "../../ports/pathExists.js";
import type { ResolveBubbleByIdPort } from "../../ports/bubbleLookup.js";
import type { EnsureBubbleInstanceIdForMutationPort } from "../../ports/bubbleIdentity.js";
import type { ReadStateSnapshotPort } from "../../ports/stateSnapshots.js";
import type { CleanupWorktreeWorkspacePort } from "../../ports/worktreeWorkspace.js";
import type {
  ReadRuntimeSessionsRegistryPort,
  RemoveRuntimeSessionPort
} from "../../ports/runtimeSessions.js";
import type { RemoveWatchdogPaneActivityPort } from "../../ports/watchdogPaneActivity.js";
import type {
  TerminateBubbleTmuxSessionPort,
  TmuxRunner
} from "../../ports/tmuxSessions.js";
import type { RemoteBubbleStatusTarget } from "../../shared/status/remoteBubbleStatusContract.js";
import type { stopBubbleCommandOrchestration } from "../stop/stopCommandOrchestration.js";

export interface DeleteBubbleInput {
  bubbleId: string;
  repoPath?: string | undefined;
  cwd?: string | undefined;
  force?: boolean | undefined;
  archiveRootPath?: string | undefined;
  now?: Date | undefined;
}

interface TmuxCommandErrorConstructor {
  new(args: string[], exitCode: number, stderr: string): Error;
}

interface CreateArchiveSnapshotInput {
  repoPath: string;
  bubbleId: string;
  bubbleInstanceId: string;
  bubbleDir: string;
  sourceBubbleDir?: string | undefined;
  locksDir: string;
  now?: Date | undefined;
  archiveRootPath?: string | undefined;
}

interface CreateArchiveSnapshotResult {
  archivePath: string;
  manifest: ArchiveManifest;
  reusedExisting: boolean;
}

interface UpsertDeletedArchiveIndexEntryInput {
  repoPath: string;
  bubbleId: string;
  bubbleInstanceId: string;
  archivePath: string;
  locksDir: string;
  createdAt?: string | null | undefined;
  now?: Date | undefined;
  archiveRootPath?: string | undefined;
}

interface UpsertDeletedArchiveIndexEntryResult {
  indexPath: string;
  entry: ArchiveIndexEntry;
}

interface RemoteDeleteArchiveCapture {
  sourceBubbleDir: string;
  bubbleToml: string;
  stateJson: string;
  transcriptNdjson: string;
  inboxNdjson: string;
  taskMarkdown?: string;
}

interface DefaultExecuteRemoteBubbleDeleteCommandInput {
  bubbleId: string;
  remoteClonePath: string;
  remoteTarget: RemoteBubbleStatusTarget;
  force: boolean;
}

interface DefaultExecuteRemoteBubbleDeleteCommandResult {
  result: DeleteBubbleResult;
  archiveCapture?: RemoteDeleteArchiveCapture;
}

export interface DeleteBubbleDefaultDependencies {
  buildBubbleTmuxSessionName: (bubbleId: string) => string;
  branchExists: BranchExistsPort;
  cleanupWorktreeWorkspace: CleanupWorktreeWorkspacePort;
  createArchiveSnapshot: (
    input: CreateArchiveSnapshotInput
  ) => Promise<CreateArchiveSnapshotResult>;
  executeRemoteBubbleDeleteCommand: (
    input: DefaultExecuteRemoteBubbleDeleteCommandInput
  ) => Promise<DefaultExecuteRemoteBubbleDeleteCommandResult>;
  ensureBubbleInstanceIdForMutation: EnsureBubbleInstanceIdForMutationPort;
  pathExists: PathExistsPort;
  readRemotePointer: (
    path: string
  ) => Promise<BubbleRemotePointerStarted | BubbleRemotePointerCreated | null>;
  readRuntimeSessionsRegistry: ReadRuntimeSessionsRegistryPort;
  readStateSnapshot: ReadStateSnapshotPort;
  removeWatchdogPaneActivity: RemoveWatchdogPaneActivityPort;
  removeRuntimeSession: RemoveRuntimeSessionPort;
  resolveRemoteBubbleStatusTarget: (input: {
    bubbleId: string;
    remoteAlias: string;
    expectedHost?: string;
  }) => Promise<RemoteBubbleStatusTarget>;
  resolveBubbleById: ResolveBubbleByIdPort;
  runTmux: TmuxRunner;
  stopBubble: typeof stopBubbleCommandOrchestration;
  TmuxCommandError: TmuxCommandErrorConstructor;
  terminateBubbleTmuxSession: TerminateBubbleTmuxSessionPort;
  upsertDeletedArchiveIndexEntry: (
    input: UpsertDeletedArchiveIndexEntryInput
  ) => Promise<UpsertDeletedArchiveIndexEntryResult>;
}

export type DeleteRemoteBubbleStatusTarget = Awaited<
  ReturnType<DeleteBubbleDefaultDependencies["resolveRemoteBubbleStatusTarget"]>
>;

export type ExecuteRemoteDeleteBubbleCommand =
  DeleteBubbleDefaultDependencies["executeRemoteBubbleDeleteCommand"];

export type ExecuteRemoteBubbleDeleteCommandInput = Parameters<
  ExecuteRemoteDeleteBubbleCommand
>[0];

export type ExecuteRemoteBubbleDeleteCommandResult = Awaited<
  ReturnType<ExecuteRemoteDeleteBubbleCommand>
>;

export interface DeleteBubbleDependencies {
  buildBubbleTmuxSessionName: DeleteBubbleDefaultDependencies["buildBubbleTmuxSessionName"];
  resolveBubbleById: DeleteBubbleDefaultDependencies["resolveBubbleById"];
  branchExists: BranchExistsPort;
  pathExists: PathExistsPort;
  runTmux: DeleteBubbleDefaultDependencies["runTmux"];
  readRuntimeSessionsRegistry: DeleteBubbleDefaultDependencies["readRuntimeSessionsRegistry"];
  terminateBubbleTmuxSession: DeleteBubbleDefaultDependencies["terminateBubbleTmuxSession"];
  removeRuntimeSession: DeleteBubbleDefaultDependencies["removeRuntimeSession"];
  cleanupWorktreeWorkspace: DeleteBubbleDefaultDependencies["cleanupWorktreeWorkspace"];
  removeBubbleDirectory?: ((path: string) => Promise<void>) | undefined;
  removeWatchdogPaneActivity: RemoveWatchdogPaneActivityPort;
  stopBubble: DeleteBubbleDefaultDependencies["stopBubble"];
  createArchiveSnapshot: DeleteBubbleDefaultDependencies["createArchiveSnapshot"];
  upsertDeletedArchiveIndexEntry: DeleteBubbleDefaultDependencies["upsertDeletedArchiveIndexEntry"];
  readRemotePointer: (
    path: string
  ) => Promise<BubbleRemotePointerStarted | BubbleRemotePointerCreated | null>;
  resolveRemoteBubbleStatusTarget: DeleteBubbleDefaultDependencies["resolveRemoteBubbleStatusTarget"];
  executeRemoteBubbleDeleteCommand: ExecuteRemoteDeleteBubbleCommand;
  ensureBubbleInstanceIdForMutation: DeleteBubbleDefaultDependencies["ensureBubbleInstanceIdForMutation"];
  readStateSnapshot: DeleteBubbleDefaultDependencies["readStateSnapshot"];
  TmuxCommandError: DeleteBubbleDefaultDependencies["TmuxCommandError"];
}
