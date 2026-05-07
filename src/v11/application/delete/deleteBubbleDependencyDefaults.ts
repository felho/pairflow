import type { BranchExistsPort } from "../../shared/ports/git.js";
import type { PathExistsPort } from "../../shared/ports/pathExists.js";
import type { ResolveBubbleByIdPort } from "../../shared/ports/bubbleLookup.js";
import type { EnsureBubbleInstanceIdForMutationPort } from "../../shared/ports/bubbleIdentity.js";
import type { ReadStateSnapshotPort } from "../../shared/ports/stateSnapshots.js";
import type { CleanupWorktreeWorkspacePort } from "../../shared/ports/worktreeWorkspace.js";
import type {
  ReadRuntimeSessionsRegistryPort,
  RemoveRuntimeSessionPort
} from "../../shared/ports/runtimeSessions.js";
import type { RemoveWatchdogPaneActivityPort } from "../../shared/ports/watchdogPaneActivity.js";
import type {
  TerminateBubbleTmuxSessionPort,
  TmuxRunner
} from "../../shared/ports/tmuxSessions.js";
import type {
  BubbleRemotePointerCreated,
  BubbleRemotePointerStarted
} from "../../../types/bubble.js";
import type {
  ArchiveIndexEntry,
  ArchiveManifest
} from "../../../types/archive.js";
import type { DeleteBubbleResult } from "../../../contracts/deleteBubble.js";
import type { RemoteBubbleStatusTarget } from "../../shared/status/remoteBubbleStatusContract.js";
import type { stopBubbleV11 } from "../stop/emitStopV11.js";

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

interface ExecuteRemoteBubbleDeleteCommandInput {
  bubbleId: string;
  remoteClonePath: string;
  remoteTarget: RemoteBubbleStatusTarget;
  force: boolean;
}

interface ExecuteRemoteBubbleDeleteCommandResult {
  result: DeleteBubbleResult;
  archiveCapture?: RemoteDeleteArchiveCapture;
}

export interface DeleteBubbleDependencyDefaults {
  buildBubbleTmuxSessionName: (bubbleId: string) => string;
  branchExists: BranchExistsPort;
  cleanupWorktreeWorkspace: CleanupWorktreeWorkspacePort;
  createArchiveSnapshot: (
    input: CreateArchiveSnapshotInput
  ) => Promise<CreateArchiveSnapshotResult>;
  executeRemoteBubbleDeleteCommand: (
    input: ExecuteRemoteBubbleDeleteCommandInput
  ) => Promise<ExecuteRemoteBubbleDeleteCommandResult>;
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
  stopBubble: typeof stopBubbleV11;
  TmuxCommandError: TmuxCommandErrorConstructor;
  terminateBubbleTmuxSession: TerminateBubbleTmuxSessionPort;
  upsertDeletedArchiveIndexEntry: (
    input: UpsertDeletedArchiveIndexEntryInput
  ) => Promise<UpsertDeletedArchiveIndexEntryResult>;
}

interface DeleteBubbleDefaultsModule {
  deleteBubbleDependencyDefaults: DeleteBubbleDependencyDefaults;
}

let deleteBubbleDefaultsModulePromise:
  | Promise<DeleteBubbleDefaultsModule>
  | undefined;

function getDeleteBubbleDefaultsModulePath(): string {
  return ["..", "..", "defaults", "delete", "deleteBubbleDefaults.js"].join("/");
}

async function loadDeleteBubbleDefaultsModule():
  Promise<DeleteBubbleDefaultsModule> {
  deleteBubbleDefaultsModulePromise ??=
    import(getDeleteBubbleDefaultsModulePath()) as Promise<DeleteBubbleDefaultsModule>;
  return deleteBubbleDefaultsModulePromise;
}

const { deleteBubbleDependencyDefaults } =
  await loadDeleteBubbleDefaultsModule();

export { deleteBubbleDependencyDefaults };
