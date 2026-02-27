import { rm } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";

import type { DeleteBubbleArtifacts, DeleteBubbleResult } from "../../contracts/deleteBubble.js";
import type { BubbleLifecycleState } from "../../types/bubble.js";
import { branchExists } from "../workspace/git.js";
import {
  cleanupWorktreeWorkspace,
  WorkspaceCleanupError
} from "../workspace/worktreeManager.js";
import { BubbleLookupError, resolveBubbleById } from "./bubbleLookup.js";
import {
  buildBubbleTmuxSessionName,
  runTmux,
  terminateBubbleTmuxSession,
  TmuxCommandError,
  type TmuxRunner
} from "../runtime/tmuxManager.js";
import {
  readRuntimeSessionsRegistry,
  removeRuntimeSession,
  RuntimeSessionsRegistryError,
  RuntimeSessionsRegistryLockError
} from "../runtime/sessionsRegistry.js";
import { readStateSnapshot } from "../state/stateStore.js";
import { stopBubble, StopBubbleError } from "./stopBubble.js";
import { pathExists } from "../util/pathExists.js";
import { ensureBubbleInstanceIdForMutation } from "./bubbleInstanceId.js";
import { emitBubbleLifecycleEventBestEffort } from "../metrics/bubbleEvents.js";
import {
  createArchiveSnapshot,
  type CreateArchiveSnapshotInput
} from "../archive/archiveSnapshot.js";
import {
  upsertDeletedArchiveIndexEntry,
  type UpsertDeletedArchiveIndexEntryInput
} from "../archive/archiveIndex.js";

export type {
  DeleteBubbleArtifacts,
  DeleteBubbleResult
} from "../../contracts/deleteBubble.js";

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

export class DeleteBubbleError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "DeleteBubbleError";
  }
}

function inferCreatedAtFromBubbleInstanceId(
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

function formatDeleteStepError(input: {
  bubbleId: string;
  bubbleInstanceId: string;
  step: "snapshot" | "index" | "worktree-cleanup" | "remove-active";
  error: unknown;
}): DeleteBubbleError {
  const reason = input.error instanceof Error ? input.error.message : String(input.error);
  return new DeleteBubbleError(
    `Delete failed: bubble_id=${input.bubbleId} bubble_instance_id=${input.bubbleInstanceId} step=${input.step} reason=${reason}`
  );
}

async function isTmuxSessionAlive(
  sessionName: string,
  runner: TmuxRunner
): Promise<boolean> {
  const result = await runner(["has-session", "-t", sessionName], {
    allowFailure: true
  });
  if (result.exitCode === 0) {
    return true;
  }
  if (result.exitCode === 1) {
    return false;
  }
  const stderr = result.stderr.trim();
  const suffix = stderr.length > 0 ? `: ${stderr}` : "";
  throw new DeleteBubbleError(
    `tmux has-session failed for ${sessionName} (exit ${result.exitCode})${suffix}`
  );
}

const preDeleteStopStateByLifecycle: Readonly<
  Record<BubbleLifecycleState, boolean>
> = {
  CREATED: false,
  PREPARING_WORKSPACE: true,
  RUNNING: true,
  WAITING_HUMAN: true,
  READY_FOR_APPROVAL: true,
  APPROVED_FOR_COMMIT: true,
  COMMITTED: false,
  DONE: false,
  FAILED: false,
  CANCELLED: false
};

export async function deleteBubble(
  input: DeleteBubbleInput,
  dependencies: DeleteBubbleDependencies = {}
): Promise<DeleteBubbleResult> {
  const now = input.now ?? new Date();
  const resolveBubble = dependencies.resolveBubbleById ?? resolveBubbleById;
  const checkBranchExists = dependencies.branchExists ?? branchExists;
  const runTmuxCommand = dependencies.runTmux ?? runTmux;
  const readRuntimeSessions =
    dependencies.readRuntimeSessionsRegistry ?? readRuntimeSessionsRegistry;
  const terminateTmux =
    dependencies.terminateBubbleTmuxSession ?? terminateBubbleTmuxSession;
  const removeSession = dependencies.removeRuntimeSession ?? removeRuntimeSession;
  const cleanup = dependencies.cleanupWorktreeWorkspace ?? cleanupWorktreeWorkspace;
  const removeBubbleDirectory =
    dependencies.removeBubbleDirectory ??
    (async (path: string) => {
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
    });
  const stop = dependencies.stopBubble ?? stopBubble;
  const archiveSnapshot = dependencies.createArchiveSnapshot ?? createArchiveSnapshot;
  const upsertArchiveIndexEntry =
    dependencies.upsertDeletedArchiveIndexEntry ?? upsertDeletedArchiveIndexEntry;
  const archiveLocksDir = join(homedir(), ".pairflow", "locks");

  const resolved = await resolveBubble({
    bubbleId: input.bubbleId,
    ...(input.repoPath !== undefined ? { repoPath: input.repoPath } : {}),
    ...(input.cwd !== undefined ? { cwd: input.cwd } : {})
  });

  const [worktreeExists, bubbleBranchExists, runtimeSessions] = await Promise.all([
    pathExists(resolved.bubblePaths.worktreePath),
    checkBranchExists(resolved.repoPath, resolved.bubbleConfig.bubble_branch),
    readRuntimeSessions(resolved.bubblePaths.sessionsPath, {
      allowMissing: true
    })
  ]);

  const runtimeSession = runtimeSessions[resolved.bubbleId] ?? null;
  const tmuxSessionName =
    runtimeSession?.tmuxSessionName ?? buildBubbleTmuxSessionName(resolved.bubbleId);
  const tmuxSessionExists = await isTmuxSessionAlive(tmuxSessionName, runTmuxCommand);

  const artifacts: DeleteBubbleArtifacts = {
    worktree: {
      exists: worktreeExists,
      path: resolved.bubblePaths.worktreePath
    },
    tmux: {
      exists: tmuxSessionExists,
      sessionName: tmuxSessionName
    },
    runtimeSession: {
      exists: runtimeSession !== null,
      sessionName: runtimeSession?.tmuxSessionName ?? null
    },
    branch: {
      exists: bubbleBranchExists,
      name: resolved.bubbleConfig.bubble_branch
    }
  };

  const hasExternalArtifacts =
    artifacts.worktree.exists ||
    artifacts.tmux.exists ||
    artifacts.branch.exists;

  if (hasExternalArtifacts && input.force !== true) {
    return {
      bubbleId: resolved.bubbleId,
      deleted: false,
      requiresConfirmation: true,
      artifacts,
      tmuxSessionTerminated: false,
      runtimeSessionRemoved: false,
      removedWorktree: false,
      removedBubbleBranch: false
    };
  }

  const bubbleIdentity = await ensureBubbleInstanceIdForMutation({
    bubbleId: resolved.bubbleId,
    repoPath: resolved.repoPath,
    bubblePaths: resolved.bubblePaths,
    bubbleConfig: resolved.bubbleConfig,
    now
  });
  resolved.bubbleConfig = bubbleIdentity.bubbleConfig;

  let requiresPreDeleteStop = false;
  let metricsRound: number | null = null;
  try {
    const loadedState = await readStateSnapshot(resolved.bubblePaths.statePath);
    requiresPreDeleteStop = preDeleteStopStateByLifecycle[loadedState.state.state];
    metricsRound = loadedState.state.round > 0 ? loadedState.state.round : null;
  } catch {
    // Force-delete should still clean up corrupted bubbles when state.json is missing
    // or invalid, so we fall back to direct artifact cleanup.
    requiresPreDeleteStop = false;
  }

  let tmuxSessionTerminated = false;
  let runtimeSessionRemoved = false;
  if (requiresPreDeleteStop) {
    const stopResult = await stop({
      bubbleId: resolved.bubbleId,
      repoPath: resolved.repoPath,
      ...(input.cwd !== undefined ? { cwd: input.cwd } : {})
    });
    tmuxSessionTerminated = stopResult.tmuxSessionExisted;
    runtimeSessionRemoved = stopResult.runtimeSessionRemoved;
    if (!runtimeSessionRemoved && artifacts.runtimeSession.exists) {
      runtimeSessionRemoved = await removeSession({
        sessionsPath: resolved.bubblePaths.sessionsPath,
        bubbleId: resolved.bubbleId
      });
    }
  } else if (artifacts.tmux.exists) {
    const terminated = await terminateTmux({
      sessionName: artifacts.tmux.sessionName
    });
    tmuxSessionTerminated = terminated.existed;
  }

  if (!requiresPreDeleteStop && artifacts.runtimeSession.exists) {
    runtimeSessionRemoved = await removeSession({
      sessionsPath: resolved.bubblePaths.sessionsPath,
      bubbleId: resolved.bubbleId
    });
  }

  const createdAtFromMetadata = inferCreatedAtFromBubbleInstanceId(
    bubbleIdentity.bubbleInstanceId
  );
  let archivePath: string;
  try {
    const snapshot = await archiveSnapshot({
      repoPath: resolved.repoPath,
      bubbleId: resolved.bubbleId,
      bubbleInstanceId: bubbleIdentity.bubbleInstanceId,
      bubbleDir: resolved.bubblePaths.bubbleDir,
      locksDir: archiveLocksDir,
      ...(input.archiveRootPath !== undefined
        ? { archiveRootPath: input.archiveRootPath }
        : {}),
      now
    });
    archivePath = snapshot.archivePath;
  } catch (error) {
    throw formatDeleteStepError({
      bubbleId: resolved.bubbleId,
      bubbleInstanceId: bubbleIdentity.bubbleInstanceId,
      step: "snapshot",
      error
    });
  }

  try {
    await upsertArchiveIndexEntry({
      repoPath: resolved.repoPath,
      bubbleId: resolved.bubbleId,
      bubbleInstanceId: bubbleIdentity.bubbleInstanceId,
      archivePath,
      locksDir: archiveLocksDir,
      createdAt: createdAtFromMetadata,
      ...(input.archiveRootPath !== undefined
        ? { archiveRootPath: input.archiveRootPath }
        : {}),
      now
    });
  } catch (error) {
    throw formatDeleteStepError({
      bubbleId: resolved.bubbleId,
      bubbleInstanceId: bubbleIdentity.bubbleInstanceId,
      step: "index",
      error
    });
  }

  let removedWorktree = false;
  let removedBubbleBranch = false;
  if (artifacts.worktree.exists || artifacts.branch.exists) {
    try {
      const cleanupResult = await cleanup({
        repoPath: resolved.repoPath,
        bubbleBranch: resolved.bubbleConfig.bubble_branch,
        worktreePath: resolved.bubblePaths.worktreePath
      });
      removedWorktree = cleanupResult.removedWorktree;
      removedBubbleBranch = cleanupResult.removedBranch;
    } catch (error) {
      throw formatDeleteStepError({
        bubbleId: resolved.bubbleId,
        bubbleInstanceId: bubbleIdentity.bubbleInstanceId,
        step: "worktree-cleanup",
        error
      });
    }
  }

  try {
    await removeBubbleDirectory(resolved.bubblePaths.bubbleDir);
  } catch (error) {
    throw formatDeleteStepError({
      bubbleId: resolved.bubbleId,
      bubbleInstanceId: bubbleIdentity.bubbleInstanceId,
      step: "remove-active",
      error
    });
  }

  await emitBubbleLifecycleEventBestEffort({
    repoPath: resolved.repoPath,
    bubbleId: resolved.bubbleId,
    bubbleInstanceId: bubbleIdentity.bubbleInstanceId,
    eventType: "bubble_deleted",
    round: metricsRound,
    actorRole: "orchestrator",
    metadata: {
      force: input.force === true,
      tmux_session_terminated: tmuxSessionTerminated,
      runtime_session_removed: runtimeSessionRemoved,
      removed_worktree: removedWorktree,
      removed_bubble_branch: removedBubbleBranch,
      had_worktree: artifacts.worktree.exists,
      had_tmux_session: artifacts.tmux.exists,
      had_runtime_session: artifacts.runtimeSession.exists,
      had_branch: artifacts.branch.exists
    },
    now
  });

  return {
    bubbleId: resolved.bubbleId,
    deleted: true,
    requiresConfirmation: false,
    artifacts,
    tmuxSessionTerminated,
    runtimeSessionRemoved,
    removedWorktree,
    removedBubbleBranch
  };
}

export function asDeleteBubbleError(error: unknown): never {
  if (error instanceof DeleteBubbleError) {
    throw error;
  }
  if (error instanceof BubbleLookupError) {
    throw new DeleteBubbleError(error.message);
  }
  if (error instanceof TmuxCommandError) {
    throw new DeleteBubbleError(error.message);
  }
  if (error instanceof StopBubbleError) {
    throw new DeleteBubbleError(error.message);
  }
  if (
    error instanceof RuntimeSessionsRegistryError ||
    error instanceof RuntimeSessionsRegistryLockError
  ) {
    throw new DeleteBubbleError(error.message);
  }
  if (error instanceof WorkspaceCleanupError) {
    throw new DeleteBubbleError(error.message);
  }
  if (error instanceof Error) {
    throw new DeleteBubbleError(error.message);
  }
  throw error;
}
