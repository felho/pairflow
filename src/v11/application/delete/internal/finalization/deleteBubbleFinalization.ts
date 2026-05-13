import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { basename, dirname, join } from "node:path";

import { emitBubbleLifecycleEventBestEffort } from "../../../metrics/bubbleEvents.js";
import type {
  DeleteBubbleArtifacts
} from "../../../../../contracts/deleteBubble.js";
import type {
  DeleteBubbleInput,
  ExecuteRemoteBubbleDeleteCommandResult
} from "../../deleteBubbleContract.js";
import type {
  DeleteExecutionContext,
  DeleteRuntimeCleanupResult,
  DeleteWorkspaceCleanupResult,
  ResolvedBubble,
  ResolvedDeleteDependencies
} from "../types/deleteTypes.js";

type RemoteDeleteArchiveCapture = NonNullable<
  ExecuteRemoteBubbleDeleteCommandResult["archiveCapture"]
>;

export async function createDeleteArchive(input: {
  input: DeleteBubbleInput;
  resolved: ResolvedBubble;
  execution: DeleteExecutionContext;
  dependencies: ResolvedDeleteDependencies;
  remoteArchiveCapture?: RemoteDeleteArchiveCapture | undefined;
  now: Date;
  inferCreatedAtFromBubbleInstanceId: (bubbleInstanceId: string) => string | null;
  reportWarning?: (message: string) => void;
  removeDirectory?: typeof rm;
  toDeleteStepError: (input: {
    bubbleId: string;
    bubbleInstanceId: string;
    step: "snapshot" | "index";
    error: unknown;
  }) => Error;
}): Promise<void> {
  const createdAt = input.inferCreatedAtFromBubbleInstanceId(
    input.execution.bubbleInstanceId
  );
  let archiveBubbleDir = input.resolved.bubblePaths.bubbleDir;

  if (input.remoteArchiveCapture !== undefined) {
    try {
      archiveBubbleDir = await materializeRemoteArchiveContinuity({
        bubbleId: input.resolved.bubbleId,
        bubbleDir: input.resolved.bubblePaths.bubbleDir,
        archiveCapture: input.remoteArchiveCapture,
        ...(input.reportWarning !== undefined
          ? { reportWarning: input.reportWarning }
          : {}),
        ...(input.removeDirectory !== undefined
          ? { removeDirectory: input.removeDirectory }
          : {})
      });
    } catch (error) {
      throw input.toDeleteStepError({
        bubbleId: input.resolved.bubbleId,
        bubbleInstanceId: input.execution.bubbleInstanceId,
        step: "snapshot",
        error
      });
    }
  }

  try {
    let archivePath: string;
    try {
      const snapshot = await input.dependencies.createArchiveSnapshot({
        repoPath: input.resolved.repoPath,
        bubbleId: input.resolved.bubbleId,
        bubbleInstanceId: input.execution.bubbleInstanceId,
        bubbleDir: archiveBubbleDir,
        ...(input.remoteArchiveCapture !== undefined
          ? { sourceBubbleDir: input.remoteArchiveCapture.sourceBubbleDir }
          : {}),
        locksDir: input.dependencies.archiveLocksDir,
        ...(input.input.archiveRootPath !== undefined
          ? { archiveRootPath: input.input.archiveRootPath }
          : {}),
        now: input.now
      });
      archivePath = snapshot.archivePath;
    } catch (error) {
      throw input.toDeleteStepError({
        bubbleId: input.resolved.bubbleId,
        bubbleInstanceId: input.execution.bubbleInstanceId,
        step: "snapshot",
        error
      });
    }

    try {
      await input.dependencies.upsertDeletedArchiveIndexEntry({
        repoPath: input.resolved.repoPath,
        bubbleId: input.resolved.bubbleId,
        bubbleInstanceId: input.execution.bubbleInstanceId,
        archivePath,
        locksDir: input.dependencies.archiveLocksDir,
        createdAt,
        ...(input.input.archiveRootPath !== undefined
          ? { archiveRootPath: input.input.archiveRootPath }
          : {}),
        now: input.now
      });
    } catch (error) {
      throw input.toDeleteStepError({
        bubbleId: input.resolved.bubbleId,
        bubbleInstanceId: input.execution.bubbleInstanceId,
        step: "index",
        error
      });
    }
  } finally {
    if (archiveBubbleDir !== input.resolved.bubblePaths.bubbleDir) {
      await cleanupArchiveStagingDirectory({
        bubbleId: input.resolved.bubbleId,
        stagingBubbleDir: archiveBubbleDir,
        phase: "archive finalization cleanup",
        ...(input.reportWarning !== undefined
          ? { reportWarning: input.reportWarning }
          : {}),
        ...(input.removeDirectory !== undefined
          ? { removeDirectory: input.removeDirectory }
          : {})
      });
    }
  }
}

async function materializeRemoteArchiveContinuity(input: {
  bubbleId: string;
  bubbleDir: string;
  archiveCapture: RemoteDeleteArchiveCapture;
  reportWarning?: (message: string) => void;
  removeDirectory?: typeof rm;
}): Promise<string> {
  const stagingBubbleDir = await mkdtemp(
    join(
      dirname(input.bubbleDir),
      `${basename(input.bubbleDir)}.remote-archive-`
    )
  );
  const artifactDir = join(stagingBubbleDir, "artifacts");

  try {
    await mkdir(artifactDir, { recursive: true });
    await Promise.all([
      writeFile(
        join(stagingBubbleDir, "bubble.toml"),
        input.archiveCapture.bubbleToml,
        "utf8"
      ),
      writeFile(
        join(stagingBubbleDir, "state.json"),
        input.archiveCapture.stateJson,
        "utf8"
      ),
      writeFile(
        join(stagingBubbleDir, "transcript.ndjson"),
        input.archiveCapture.transcriptNdjson,
        "utf8"
      ),
      writeFile(
        join(stagingBubbleDir, "inbox.ndjson"),
        input.archiveCapture.inboxNdjson,
        "utf8"
      ),
      ...(input.archiveCapture.taskMarkdown !== undefined
        ? [
            writeFile(
              join(artifactDir, "task.md"),
              input.archiveCapture.taskMarkdown,
              "utf8"
            )
          ]
        : [])
    ]);
    return stagingBubbleDir;
  } catch (error) {
    await cleanupArchiveStagingDirectory({
      bubbleId: input.bubbleId,
      stagingBubbleDir,
      phase: "archive materialization rollback",
      ...(input.reportWarning !== undefined
        ? { reportWarning: input.reportWarning }
        : {}),
      ...(input.removeDirectory !== undefined
        ? { removeDirectory: input.removeDirectory }
        : {})
    });
    throw error;
  }
}

function reportDeleteArchiveWarning(message: string): void {
  process.stderr.write(`${message}\n`);
}

async function cleanupArchiveStagingDirectory(input: {
  bubbleId: string;
  stagingBubbleDir: string;
  phase: "archive finalization cleanup" | "archive materialization rollback";
  reportWarning?: (message: string) => void;
  removeDirectory?: typeof rm;
}): Promise<void> {
  const removeDirectory = input.removeDirectory ?? rm;
  const reportWarning = input.reportWarning ?? reportDeleteArchiveWarning;

  try {
    await removeDirectory(input.stagingBubbleDir, {
      recursive: true,
      force: true
    });
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    // Archive continuity is already authoritative at this point, so leaking the
    // staging directory is noisy but must remain non-blocking for delete finalization.
    reportWarning(
      `Pairflow warning: failed ${input.phase} for remote archive staging directory on bubble ${input.bubbleId}; leaving ${input.stagingBubbleDir} in place. reason=${reason}`
    );
  }
}

export async function cleanupDeleteWorkspace(input: {
  resolved: ResolvedBubble;
  artifacts: DeleteBubbleArtifacts;
  execution: DeleteExecutionContext;
  worktreePath: string;
  dependencies: ResolvedDeleteDependencies;
  toDeleteStepError: (input: {
    bubbleId: string;
    bubbleInstanceId: string;
    step: "worktree-cleanup" | "remove-active" | "remove-runtime-health";
    error: unknown;
  }) => Error;
}): Promise<DeleteWorkspaceCleanupResult> {
  let removedWorktree = false;
  let removedBubbleBranch = false;

  if (input.artifacts.worktree.exists || input.artifacts.branch.exists) {
    try {
      const cleanupResult = await input.dependencies.cleanupWorktreeWorkspace({
        repoPath: input.resolved.repoPath,
        bubbleBranch: input.resolved.bubbleConfig.bubble_branch,
        worktreePath: input.worktreePath
      });
      removedWorktree = cleanupResult.removedWorktree;
      removedBubbleBranch = cleanupResult.removedBranch;
    } catch (error) {
      throw input.toDeleteStepError({
        bubbleId: input.resolved.bubbleId,
        bubbleInstanceId: input.execution.bubbleInstanceId,
        step: "worktree-cleanup",
        error
      });
    }
  }

  await removeDeleteBubbleDirectory({
    resolved: input.resolved,
    execution: input.execution,
    dependencies: input.dependencies,
    toDeleteStepError: input.toDeleteStepError
  });

  return { removedWorktree, removedBubbleBranch };
}

export async function removeDeleteBubbleDirectory(input: {
  resolved: ResolvedBubble;
  execution: DeleteExecutionContext;
  dependencies: ResolvedDeleteDependencies;
  toDeleteStepError: (input: {
    bubbleId: string;
    bubbleInstanceId: string;
    step: "remove-active" | "remove-runtime-health";
    error: unknown;
  }) => Error;
}): Promise<void> {
  try {
    await input.dependencies.removeBubbleDirectory(input.resolved.bubblePaths.bubbleDir);
  } catch (error) {
    throw input.toDeleteStepError({
      bubbleId: input.resolved.bubbleId,
      bubbleInstanceId: input.execution.bubbleInstanceId,
      step: "remove-active",
      error
    });
  }

  try {
    await input.dependencies.removeWatchdogPaneActivity({
      runtimeDir: input.resolved.bubblePaths.runtimeDir,
      bubbleId: input.resolved.bubbleId
    });
  } catch (error) {
    throw input.toDeleteStepError({
      bubbleId: input.resolved.bubbleId,
      bubbleInstanceId: input.execution.bubbleInstanceId,
      step: "remove-runtime-health",
      error
    });
  }
}

export async function emitDeleteLifecycleEvent(input: {
  resolved: ResolvedBubble;
  artifacts: DeleteBubbleArtifacts;
  execution: DeleteExecutionContext;
  runtimeCleanup: DeleteRuntimeCleanupResult;
  workspaceCleanup: DeleteWorkspaceCleanupResult;
  force: boolean;
  now: Date;
}): Promise<void> {
  await emitBubbleLifecycleEventBestEffort({
    repoPath: input.resolved.repoPath,
    bubbleId: input.resolved.bubbleId,
    bubbleInstanceId: input.execution.bubbleInstanceId,
    eventType: "bubble_deleted",
    round: input.execution.metricsRound,
    actorRole: "orchestrator",
    metadata: {
      force: input.force,
      tmux_session_terminated: input.runtimeCleanup.tmuxSessionTerminated,
      runtime_session_removed: input.runtimeCleanup.runtimeSessionRemoved,
      removed_worktree: input.workspaceCleanup.removedWorktree,
      removed_bubble_branch: input.workspaceCleanup.removedBubbleBranch,
      had_worktree: input.artifacts.worktree.exists,
      had_tmux_session: input.artifacts.tmux.exists,
      had_runtime_session: input.artifacts.runtimeSession.exists,
      had_branch: input.artifacts.branch.exists
    },
    now: input.now
  });
}
