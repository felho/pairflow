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
import { deleteBubbleDependencyDefaults } from "./deleteBubbleDependencyDefaults.js";
import type { BranchExistsPort } from "../../shared/ports/git.js";
import type { PathExistsPort } from "../../shared/ports/pathExists.js";
import type { RemoveWatchdogPaneActivityPort } from "../../shared/ports/watchdogPaneActivity.js";
import { inferBubbleStartedAtFromInstanceId } from "../../shared/bubble/bubbleInstanceId.js";
import { stopBubbleV11 as stopBubble } from "../stop/emitStopV11.js";
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

export type DeleteRemoteBubbleStatusTarget = Awaited<
  ReturnType<typeof deleteBubbleDependencyDefaults.resolveRemoteBubbleStatusTarget>
>;

export type ExecuteRemoteDeleteBubbleCommand =
  typeof deleteBubbleDependencyDefaults.executeRemoteBubbleDeleteCommand;

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
  resolveBubbleById?: typeof deleteBubbleDependencyDefaults.resolveBubbleById;
  branchExists?: BranchExistsPort;
  pathExists?: PathExistsPort;
  runTmux?: typeof deleteBubbleDependencyDefaults.runTmux;
  readRuntimeSessionsRegistry?: typeof deleteBubbleDependencyDefaults.readRuntimeSessionsRegistry;
  terminateBubbleTmuxSession?: typeof deleteBubbleDependencyDefaults.terminateBubbleTmuxSession;
  removeRuntimeSession?: typeof deleteBubbleDependencyDefaults.removeRuntimeSession;
  cleanupWorktreeWorkspace?: typeof deleteBubbleDependencyDefaults.cleanupWorktreeWorkspace;
  removeBubbleDirectory?: ((path: string) => Promise<void>) | undefined;
  removeWatchdogPaneActivity?: RemoveWatchdogPaneActivityPort | undefined;
  stopBubble?: typeof stopBubble;
  createArchiveSnapshot?:
    | typeof deleteBubbleDependencyDefaults.createArchiveSnapshot
    | undefined;
  upsertDeletedArchiveIndexEntry?:
    | typeof deleteBubbleDependencyDefaults.upsertDeletedArchiveIndexEntry
    | undefined;
  readRemotePointer?: ((
    path: string
  ) => Promise<BubbleRemotePointerStarted | BubbleRemotePointerCreated | null>) | undefined;
  resolveRemoteBubbleStatusTarget?:
    | typeof deleteBubbleDependencyDefaults.resolveRemoteBubbleStatusTarget
    | undefined;
  executeRemoteBubbleDeleteCommand?:
    | ((input: ExecuteRemoteBubbleDeleteCommandInput) => Promise<ExecuteRemoteBubbleDeleteCommandResult>)
    | undefined;
}

export interface ResolvedDeleteDependencies {
  resolveBubbleById: typeof deleteBubbleDependencyDefaults.resolveBubbleById;
  branchExists: BranchExistsPort;
  pathExists: PathExistsPort;
  runTmux: typeof deleteBubbleDependencyDefaults.runTmux;
  readRuntimeSessionsRegistry: typeof deleteBubbleDependencyDefaults.readRuntimeSessionsRegistry;
  terminateBubbleTmuxSession: typeof deleteBubbleDependencyDefaults.terminateBubbleTmuxSession;
  removeRuntimeSession: typeof deleteBubbleDependencyDefaults.removeRuntimeSession;
  cleanupWorktreeWorkspace: typeof deleteBubbleDependencyDefaults.cleanupWorktreeWorkspace;
  removeBubbleDirectory: (path: string) => Promise<void>;
  removeWatchdogPaneActivity: RemoveWatchdogPaneActivityPort;
  stopBubble: typeof stopBubble;
  createArchiveSnapshot:
    typeof deleteBubbleDependencyDefaults.createArchiveSnapshot;
  upsertDeletedArchiveIndexEntry:
    typeof deleteBubbleDependencyDefaults.upsertDeletedArchiveIndexEntry;
  readRemotePointer: NonNullable<
    DeleteBubbleDependencies["readRemotePointer"]
  >;
  resolveRemoteBubbleStatusTarget:
    typeof deleteBubbleDependencyDefaults.resolveRemoteBubbleStatusTarget;
  executeRemoteBubbleDeleteCommand: NonNullable<
    DeleteBubbleDependencies["executeRemoteBubbleDeleteCommand"]
  >;
  archiveLocksDir: string;
}

export type ResolvedBubble = Awaited<
  ReturnType<typeof deleteBubbleDependencyDefaults.resolveBubbleById>
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
    resolveBubbleById:
      dependencies.resolveBubbleById ??
      deleteBubbleDependencyDefaults.resolveBubbleById,
    branchExists:
      dependencies.branchExists ?? deleteBubbleDependencyDefaults.branchExists,
    pathExists: dependencies.pathExists ?? deleteBubbleDependencyDefaults.pathExists,
    runTmux: dependencies.runTmux ?? deleteBubbleDependencyDefaults.runTmux,
    readRuntimeSessionsRegistry:
      dependencies.readRuntimeSessionsRegistry ??
      deleteBubbleDependencyDefaults.readRuntimeSessionsRegistry,
    terminateBubbleTmuxSession:
      dependencies.terminateBubbleTmuxSession ??
      deleteBubbleDependencyDefaults.terminateBubbleTmuxSession,
    removeRuntimeSession:
      dependencies.removeRuntimeSession ??
      deleteBubbleDependencyDefaults.removeRuntimeSession,
    cleanupWorktreeWorkspace:
      dependencies.cleanupWorktreeWorkspace ??
      deleteBubbleDependencyDefaults.cleanupWorktreeWorkspace,
    removeBubbleDirectory:
      dependencies.removeBubbleDirectory ?? removeBubbleDirectory,
    removeWatchdogPaneActivity:
      dependencies.removeWatchdogPaneActivity ??
      deleteBubbleDependencyDefaults.removeWatchdogPaneActivity,
    stopBubble: dependencies.stopBubble ?? stopBubble,
    createArchiveSnapshot:
      dependencies.createArchiveSnapshot ??
      deleteBubbleDependencyDefaults.createArchiveSnapshot,
    upsertDeletedArchiveIndexEntry:
      dependencies.upsertDeletedArchiveIndexEntry ??
      deleteBubbleDependencyDefaults.upsertDeletedArchiveIndexEntry,
    readRemotePointer:
      dependencies.readRemotePointer ??
      deleteBubbleDependencyDefaults.readRemotePointer,
    resolveRemoteBubbleStatusTarget:
      dependencies.resolveRemoteBubbleStatusTarget ??
      deleteBubbleDependencyDefaults.resolveRemoteBubbleStatusTarget,
    executeRemoteBubbleDeleteCommand:
      dependencies.executeRemoteBubbleDeleteCommand ??
      deleteBubbleDependencyDefaults.executeRemoteBubbleDeleteCommand,
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
