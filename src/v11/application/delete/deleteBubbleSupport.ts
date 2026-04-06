import { rm } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";

import type {
  DeleteBubbleArtifacts,
  DeleteBubbleResult
} from "../../../contracts/deleteBubble.js";
import type { BubbleLifecycleState } from "../../../types/bubble.js";
import {
  createArchiveSnapshot,
  type CreateArchiveSnapshotInput
} from "../../infrastructure/artifact/archive/archiveSnapshot.js";
import {
  upsertDeletedArchiveIndexEntry,
  type UpsertDeletedArchiveIndexEntryInput
} from "../../infrastructure/artifact/archive/archiveIndex.js";
import { resolveBubbleById } from "../../infrastructure/executor/workspace/bubbleLookup.js";
import {
  readRuntimeSessionsRegistry,
  removeRuntimeSession
} from "../../infrastructure/executor/sessionRuntime/runtimeSessionsRegistry.js";
import {
  runTmux,
  terminateBubbleTmuxSession,
  type TmuxRunner
} from "../../infrastructure/channel/tmux/tmuxManager.js";
import { pathExists } from "../../infrastructure/foundation/fs/pathExists.js";
import { branchExists } from "../../../core/workspace/git.js";
import { cleanupWorktreeWorkspace } from "../../../core/workspace/worktreeManager.js";
import { stopBubbleV11 as stopBubble } from "../stop/emitStopV11.js";

export interface DeleteBubbleInput {
  bubbleId: string;
  repoPath?: string | undefined;
  cwd?: string | undefined;
  force?: boolean | undefined;
  archiveRootPath?: string | undefined;
  now?: Date | undefined;
}

export interface DeleteBubbleDependencies {
  resolveBubbleById?: typeof resolveBubbleById;
  branchExists?: typeof branchExists;
  pathExists?: typeof pathExists;
  runTmux?: TmuxRunner;
  readRuntimeSessionsRegistry?: typeof readRuntimeSessionsRegistry;
  terminateBubbleTmuxSession?: typeof terminateBubbleTmuxSession;
  removeRuntimeSession?: typeof removeRuntimeSession;
  cleanupWorktreeWorkspace?: typeof cleanupWorktreeWorkspace;
  removeBubbleDirectory?: ((path: string) => Promise<void>) | undefined;
  stopBubble?: typeof stopBubble;
  createArchiveSnapshot?:
    | ((input: CreateArchiveSnapshotInput) => Promise<{ archivePath: string }>)
    | undefined;
  upsertDeletedArchiveIndexEntry?:
    | ((input: UpsertDeletedArchiveIndexEntryInput) => Promise<unknown>)
    | undefined;
}

export interface ResolvedDeleteDependencies {
  resolveBubbleById: typeof resolveBubbleById;
  branchExists: typeof branchExists;
  pathExists: typeof pathExists;
  runTmux: TmuxRunner;
  readRuntimeSessionsRegistry: typeof readRuntimeSessionsRegistry;
  terminateBubbleTmuxSession: typeof terminateBubbleTmuxSession;
  removeRuntimeSession: typeof removeRuntimeSession;
  cleanupWorktreeWorkspace: typeof cleanupWorktreeWorkspace;
  removeBubbleDirectory: (path: string) => Promise<void>;
  stopBubble: typeof stopBubble;
  createArchiveSnapshot:
    (input: CreateArchiveSnapshotInput) => Promise<{ archivePath: string }>;
  upsertDeletedArchiveIndexEntry:
    (input: UpsertDeletedArchiveIndexEntryInput) => Promise<unknown>;
  archiveLocksDir: string;
}

export type ResolvedBubble = Awaited<ReturnType<typeof resolveBubbleById>>;

export interface DeleteResolution {
  resolved: ResolvedBubble;
  artifacts: DeleteBubbleArtifacts;
}

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
  const segments = bubbleInstanceId.split("_");
  if (segments.length < 3 || segments[0] !== "bi") {
    return null;
  }

  const encodedTimestamp = segments[1];
  if (encodedTimestamp === undefined || !/^[0-9a-z]+$/u.test(encodedTimestamp)) {
    return null;
  }

  const timestampMs = Number.parseInt(encodedTimestamp, 36);
  if (!Number.isSafeInteger(timestampMs) || timestampMs < 0) {
    return null;
  }

  const createdAt = new Date(timestampMs);
  if (Number.isNaN(createdAt.getTime())) {
    return null;
  }

  return createdAt.toISOString();
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
    resolveBubbleById: dependencies.resolveBubbleById ?? resolveBubbleById,
    branchExists: dependencies.branchExists ?? branchExists,
    pathExists: dependencies.pathExists ?? pathExists,
    runTmux: dependencies.runTmux ?? runTmux,
    readRuntimeSessionsRegistry:
      dependencies.readRuntimeSessionsRegistry ?? readRuntimeSessionsRegistry,
    terminateBubbleTmuxSession:
      dependencies.terminateBubbleTmuxSession ?? terminateBubbleTmuxSession,
    removeRuntimeSession: dependencies.removeRuntimeSession ?? removeRuntimeSession,
    cleanupWorktreeWorkspace:
      dependencies.cleanupWorktreeWorkspace ?? cleanupWorktreeWorkspace,
    removeBubbleDirectory:
      dependencies.removeBubbleDirectory ?? removeBubbleDirectory,
    stopBubble: dependencies.stopBubble ?? stopBubble,
    createArchiveSnapshot:
      dependencies.createArchiveSnapshot ?? createArchiveSnapshot,
    upsertDeletedArchiveIndexEntry:
      dependencies.upsertDeletedArchiveIndexEntry ??
      upsertDeletedArchiveIndexEntry,
    archiveLocksDir: join(homedir(), ".pairflow", "locks")
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
