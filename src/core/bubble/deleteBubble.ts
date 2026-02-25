import { rm } from "node:fs/promises";

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

export type {
  DeleteBubbleArtifacts,
  DeleteBubbleResult
} from "../../contracts/deleteBubble.js";

export interface DeleteBubbleInput {
  bubbleId: string;
  repoPath?: string | undefined;
  cwd?: string | undefined;
  force?: boolean | undefined;
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
}

export class DeleteBubbleError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "DeleteBubbleError";
  }
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
    artifacts.runtimeSession.exists ||
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

  let requiresPreDeleteStop = false;
  try {
    const loadedState = await readStateSnapshot(resolved.bubblePaths.statePath);
    requiresPreDeleteStop = preDeleteStopStateByLifecycle[loadedState.state.state];
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

  let removedWorktree = false;
  let removedBubbleBranch = false;
  if (artifacts.worktree.exists || artifacts.branch.exists) {
    const cleanupResult = await cleanup({
      repoPath: resolved.repoPath,
      bubbleBranch: resolved.bubbleConfig.bubble_branch,
      worktreePath: resolved.bubblePaths.worktreePath
    });
    removedWorktree = cleanupResult.removedWorktree;
    removedBubbleBranch = cleanupResult.removedBranch;
  }

  await removeBubbleDirectory(resolved.bubblePaths.bubbleDir);

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
