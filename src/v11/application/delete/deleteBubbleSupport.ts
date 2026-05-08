import { rm } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";

import type {
  DeleteBubbleArtifacts,
  DeleteBubbleResult
} from "../../../contracts/deleteBubble.js";
import type {
  BubbleLifecycleState,
  BubbleRemotePointerCreated,
  BubbleRemotePointerStarted
} from "../../../types/bubble.js";
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
import type { stopBubbleV11 } from "../stop/emitStopV11.js";
import { inferBubbleStartedAtFromInstanceId } from "../../shared/bubble/bubbleInstanceId.js";
import {
  canonicalizeDeleteExecutionPath,
  resolveRemoteDeleteExecutionContextFromEnv
} from "./remoteDeleteExecutionContext.js";

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
  stopBubble: typeof stopBubbleV11;
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

export class DeleteRouteResolutionError extends Error {
  public readonly code: string;
  public readonly context: Readonly<Record<string, unknown>>;

  public constructor(input: {
    code: string;
    message: string;
    context: Readonly<Record<string, unknown>>;
    cause?: unknown;
  }) {
    super(input.message, input.cause === undefined ? undefined : { cause: input.cause });
    this.name = "DeleteRouteResolutionError";
    this.code = input.code;
    this.context = input.context;
  }
}

function toDeleteRouteResolutionError(input: {
  code: string;
  message: string;
  context: Readonly<Record<string, unknown>>;
  cause?: unknown;
}): DeleteRouteResolutionError {
  return new DeleteRouteResolutionError(input);
}

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

export interface ResolvedDeleteDependencies {
  buildBubbleTmuxSessionName: DeleteBubbleDefaultDependencies["buildBubbleTmuxSessionName"];
  resolveBubbleById: DeleteBubbleDefaultDependencies["resolveBubbleById"];
  branchExists: BranchExistsPort;
  pathExists: PathExistsPort;
  runTmux: DeleteBubbleDefaultDependencies["runTmux"];
  readRuntimeSessionsRegistry: DeleteBubbleDefaultDependencies["readRuntimeSessionsRegistry"];
  terminateBubbleTmuxSession: DeleteBubbleDefaultDependencies["terminateBubbleTmuxSession"];
  removeRuntimeSession: DeleteBubbleDefaultDependencies["removeRuntimeSession"];
  cleanupWorktreeWorkspace: DeleteBubbleDefaultDependencies["cleanupWorktreeWorkspace"];
  removeBubbleDirectory: (path: string) => Promise<void>;
  removeWatchdogPaneActivity: RemoveWatchdogPaneActivityPort;
  stopBubble: DeleteBubbleDefaultDependencies["stopBubble"];
  createArchiveSnapshot: DeleteBubbleDefaultDependencies["createArchiveSnapshot"];
  upsertDeletedArchiveIndexEntry: DeleteBubbleDefaultDependencies["upsertDeletedArchiveIndexEntry"];
  readRemotePointer: DeleteBubbleDependencies["readRemotePointer"];
  resolveRemoteBubbleStatusTarget: DeleteBubbleDefaultDependencies["resolveRemoteBubbleStatusTarget"];
  executeRemoteBubbleDeleteCommand: ExecuteRemoteDeleteBubbleCommand;
  ensureBubbleInstanceIdForMutation: DeleteBubbleDefaultDependencies["ensureBubbleInstanceIdForMutation"];
  readStateSnapshot: DeleteBubbleDefaultDependencies["readStateSnapshot"];
  TmuxCommandError: DeleteBubbleDefaultDependencies["TmuxCommandError"];
  archiveLocksDir: string;
}

export type ResolvedBubble = Awaited<
  ReturnType<DeleteBubbleDefaultDependencies["resolveBubbleById"]>
>;

export interface DeleteResolution {
  resolved: ResolvedBubble;
  artifacts: DeleteBubbleArtifacts;
}

export interface LocalDeleteRouteContext {
  route: "local" | "remote_clone";
  resolved: ResolvedBubble;
  worktreePath: string;
}

export interface RemoteDeleteRouteContext {
  route: "remote";
  resolved: ResolvedBubble;
  remotePointer: BubbleRemotePointerStarted;
  remoteTarget: DeleteRemoteBubbleStatusTarget;
}

export type DeleteRouteContext =
  | LocalDeleteRouteContext
  | RemoteDeleteRouteContext;

export interface DeleteExecutionContext {
  bubbleInstanceId: string;
  metricsRound: number | null;
  requiresPreDeleteStop: boolean;
}

export interface DeleteRuntimeCleanupResult {
  tmuxSessionTerminated: boolean;
  runtimeSessionRemoved: boolean;
}

export interface DeleteWorkspaceCleanupResult {
  removedWorktree: boolean;
  removedBubbleBranch: boolean;
}

export function inferCreatedAtFromBubbleInstanceId(
  bubbleInstanceId: string
): string | null {
  return inferBubbleStartedAtFromInstanceId(bubbleInstanceId);
}

export async function removeBubbleDirectory(path: string): Promise<void> {
  try {
    await rm(path, { recursive: true });
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "ENOENT"
    ) {
      return;
    }
    throw error;
  }
}

export function resolveDeleteDependencies(
  dependencies: DeleteBubbleDependencies
): ResolvedDeleteDependencies {
  return {
    buildBubbleTmuxSessionName: dependencies.buildBubbleTmuxSessionName,
    resolveBubbleById: dependencies.resolveBubbleById,
    branchExists: dependencies.branchExists,
    pathExists: dependencies.pathExists,
    runTmux: dependencies.runTmux,
    readRuntimeSessionsRegistry: dependencies.readRuntimeSessionsRegistry,
    terminateBubbleTmuxSession: dependencies.terminateBubbleTmuxSession,
    removeRuntimeSession: dependencies.removeRuntimeSession,
    cleanupWorktreeWorkspace: dependencies.cleanupWorktreeWorkspace,
    removeBubbleDirectory:
      dependencies.removeBubbleDirectory ?? removeBubbleDirectory,
    removeWatchdogPaneActivity: dependencies.removeWatchdogPaneActivity,
    stopBubble: dependencies.stopBubble,
    createArchiveSnapshot: dependencies.createArchiveSnapshot,
    upsertDeletedArchiveIndexEntry: dependencies.upsertDeletedArchiveIndexEntry,
    readRemotePointer: dependencies.readRemotePointer,
    resolveRemoteBubbleStatusTarget: dependencies.resolveRemoteBubbleStatusTarget,
    executeRemoteBubbleDeleteCommand: dependencies.executeRemoteBubbleDeleteCommand,
    ensureBubbleInstanceIdForMutation:
      dependencies.ensureBubbleInstanceIdForMutation,
    readStateSnapshot: dependencies.readStateSnapshot,
    TmuxCommandError: dependencies.TmuxCommandError,
    archiveLocksDir: join(homedir(), ".pairflow", "locks")
  };
}

export async function resolveDeleteRouteContext(input: {
  deleteInput: DeleteBubbleInput;
  dependencies: ResolvedDeleteDependencies;
}): Promise<DeleteRouteContext> {
  const resolved = await input.dependencies.resolveBubbleById({
    bubbleId: input.deleteInput.bubbleId,
    ...(input.deleteInput.repoPath !== undefined
      ? { repoPath: input.deleteInput.repoPath }
      : {}),
    ...(input.deleteInput.cwd !== undefined ? { cwd: input.deleteInput.cwd } : {})
  });

  const resolvedRepoPath = canonicalizeDeleteExecutionPath(resolved.repoPath);
  if (resolved.bubbleConfig.executor?.type !== "ssh") {
    return {
      route: "local",
      resolved,
      worktreePath: resolved.bubblePaths.worktreePath
    };
  }

  const remoteDeleteExecutionContext = resolveRemoteDeleteExecutionContextFromEnv();
  const remotePointer = await input.dependencies.readRemotePointer(
    resolved.bubblePaths.remotePointerPath
  );

  if (
    remoteDeleteExecutionContext?.kind === "remote_clone"
    && remoteDeleteExecutionContext.workspaceRoot === resolvedRepoPath
  ) {
    if (remotePointer !== null) {
      throw toDeleteRouteResolutionError({
        code: "REMOTE_DELETE_SOURCE_POINTER_PRESENT",
        message:
          `Remote inner delete for '${resolved.bubbleId}' refused to continue because source-repo remote artifacts are still present.`,
        context: {
          bubbleId: resolved.bubbleId,
          repoPath: resolved.repoPath,
          remotePointerKind: remotePointer.kind,
          workspaceRoot: remoteDeleteExecutionContext.workspaceRoot
        }
      });
    }
    return {
      route: "remote_clone",
      resolved,
      worktreePath: resolved.repoPath
    };
  }

  if (remotePointer?.kind !== "started") {
    throw toDeleteRouteResolutionError({
      code: "REMOTE_DELETE_POINTER_NOT_STARTED",
      message:
        `Remote delete for '${resolved.bubbleId}' requires a started remote pointer. Run \`pairflow bubble start --id ${resolved.bubbleId}\` first.`,
      context: {
        bubbleId: resolved.bubbleId,
        repoPath: resolved.repoPath,
        remotePointerKind: remotePointer?.kind ?? null,
        workspaceRoot: remoteDeleteExecutionContext?.workspaceRoot ?? null
      }
    });
  }

  const remoteTarget = await input.dependencies.resolveRemoteBubbleStatusTarget({
    bubbleId: resolved.bubbleId,
    remoteAlias: resolved.bubbleConfig.executor.remote,
    expectedHost: remotePointer.host
  });

  return {
    route: "remote",
    resolved,
    remotePointer,
    remoteTarget
  };
}

export function requiresDeleteConfirmation(
  artifacts: DeleteBubbleArtifacts,
  force: boolean | undefined
): boolean {
  return (
    force !== true &&
    (artifacts.worktree.exists || artifacts.tmux.exists || artifacts.branch.exists)
  );
}

export function buildDeleteConfirmationResult(
  bubbleId: string,
  artifacts: DeleteBubbleArtifacts
): DeleteBubbleResult {
  return {
    bubbleId,
    deleted: false,
    requiresConfirmation: true,
    artifacts,
    tmuxSessionTerminated: false,
    runtimeSessionRemoved: false,
    removedWorktree: false,
    removedBubbleBranch: false
  };
}

export const preDeleteStopStateByLifecycle: Readonly<
  Record<BubbleLifecycleState, boolean>
> = {
  CREATED: false,
  PREPARING_WORKSPACE: true,
  RUNNING: true,
  WAITING_HUMAN: true,
  READY_FOR_HUMAN_APPROVAL: true,
  APPROVED_FOR_COMMIT: true,
  COMMITTED: false,
  DONE: false,
  FAILED: false,
  CANCELLED: false
};

export function buildDeleteSuccessResult(input: {
  bubbleId: string;
  artifacts: DeleteBubbleArtifacts;
  runtimeCleanup: DeleteRuntimeCleanupResult;
  workspaceCleanup: DeleteWorkspaceCleanupResult;
}): DeleteBubbleResult {
  return {
    bubbleId: input.bubbleId,
    deleted: true,
    requiresConfirmation: false,
    artifacts: input.artifacts,
    tmuxSessionTerminated: input.runtimeCleanup.tmuxSessionTerminated,
    runtimeSessionRemoved: input.runtimeCleanup.runtimeSessionRemoved,
    removedWorktree: input.workspaceCleanup.removedWorktree,
    removedBubbleBranch: input.workspaceCleanup.removedBubbleBranch
  };
}
