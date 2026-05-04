import { randomUUID } from "node:crypto";
import { mkdir, rename, rm, stat } from "node:fs/promises";
import { dirname } from "node:path";

import { emitBubbleLifecycleEventBestEffort } from "../../shared/metrics/bubbleEvents.js";
import type {
  AppendedEnvelope,
  CommitRuntimeContext,
  WrittenState
} from "./commitCommandApiContract.js";
import {
  appendCommitResultEnvelopeMutation,
  persistCommittedThenDoneStateMutation
} from "./commitCommandFinalizationMutation.js";

export async function appendCommitResultEnvelope(input: {
  context: CommitRuntimeContext;
  refs: string[];
  now: Date;
  stagedFiles: string[];
  commitMessage: string;
  commitSha: string;
}): Promise<AppendedEnvelope> {
  return appendCommitResultEnvelopeMutation({
    context: {
      bubbleId: input.context.resolved.bubbleId,
      bubblePaths: {
        locksDir: input.context.resolved.bubblePaths.locksDir,
        statePath: input.context.resolved.bubblePaths.statePath,
        transcriptPath: input.context.resolved.bubblePaths.transcriptPath
      },
      round: input.context.state.round
    },
    refs: input.refs,
    now: input.now,
    stagedFiles: input.stagedFiles,
    commitMessage: input.commitMessage,
    commitSha: input.commitSha,
    appendProtocolEnvelope: input.context.appendProtocolEnvelope
  });
}

export async function persistCommittedThenDoneState(input: {
  context: CommitRuntimeContext;
  nowIso: string;
  appended: AppendedEnvelope;
  commitSha: string;
}): Promise<WrittenState> {
  return persistCommittedThenDoneStateMutation({
    context: {
      statePath: input.context.resolved.bubblePaths.statePath,
      state: input.context.state,
      loadedState: input.context.loadedState
    },
    nowIso: input.nowIso,
    appended: input.appended,
    commitSha: input.commitSha,
    writeStateSnapshot: input.context.writeStateSnapshot
  });
}

export async function emitCommitLifecycleEvent(input: {
  context: {
    resolved: CommitRuntimeContext["resolved"];
    bubbleIdentity: CommitRuntimeContext["bubbleIdentity"];
    round: number;
  };
  commitSha: string;
  commitMessage: string;
  stagedFiles: string[];
  refs: string[];
  now: Date;
  auto: boolean;
}): Promise<void> {
  await emitBubbleLifecycleEventBestEffort({
    repoPath: input.context.resolved.repoPath,
    bubbleId: input.context.resolved.bubbleId,
    bubbleInstanceId: input.context.bubbleIdentity.bubbleInstanceId,
    eventType: "bubble_committed",
    round: input.context.round,
    actorRole: "orchestrator",
    metadata: {
      commit_sha: input.commitSha,
      commit_message: input.commitMessage,
      staged_file_count: input.stagedFiles.length,
      auto: input.auto,
      refs_count: input.refs.length
    },
    now: input.now
  });
}

export async function syncRemoteCommitContinuityArtifacts(input: {
  statePath: string;
  transcriptPath: string;
  stateContent: string;
  transcriptContent: string;
  renamePath?: (fromPath: string, toPath: string) => Promise<void>;
  writeTextFile: (path: string, content: string) => Promise<void>;
}): Promise<void> {
  const removePathBestEffort = async (path: string) => {
    await rm(path, { force: true }).catch(() => undefined);
  };

  const restoreBackupPath = async (entry: {
    path: string;
    backupPath: string;
  }): Promise<boolean> => {
    try {
      await renamePath(entry.backupPath, entry.path);
      return true;
    } catch {
      await removePathBestEffort(entry.path);
      try {
        await renamePath(entry.backupPath, entry.path);
        return true;
      } catch {
        return false;
      }
    }
  };

  const ensureParentDir = async (path: string) => {
    await mkdir(dirname(path), { recursive: true });
  };

  const targets = [
    {
      path: input.transcriptPath,
      content: input.transcriptContent
    },
    {
      path: input.statePath,
      content: input.stateContent
    }
  ];

  const renamePath = input.renamePath ?? rename;
  const operationId = `${Date.now()}-${process.pid}-${randomUUID()}`;
  const tempEntries: Array<{
    path: string;
    tempPath: string;
    backupPath: string;
    hadOriginal: boolean;
    backupCreated: boolean;
    applied: boolean;
  }> = [];

  const pathExists = async (path: string): Promise<boolean> => {
    try {
      await stat(path);
      return true;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return false;
      }
      throw error;
    }
  };

  try {
    for (const [index, target] of targets.entries()) {
      await ensureParentDir(target.path);
      const tempPath = `${target.path}.pairflow-sync-${operationId}-${index}.tmp`;
      const backupPath = `${target.path}.pairflow-sync-${operationId}-${index}.bak`;
      await input.writeTextFile(tempPath, target.content);
      tempEntries.push({
        path: target.path,
        tempPath,
        backupPath,
        hadOriginal: false,
        backupCreated: false,
        applied: false
      });
    }

    for (const entry of tempEntries) {
      entry.hadOriginal = await pathExists(entry.path);
      if (entry.hadOriginal) {
        await renamePath(entry.path, entry.backupPath);
        entry.backupCreated = true;
      }
      await renamePath(entry.tempPath, entry.path);
      entry.applied = true;
    }
  } catch (error) {
    for (const entry of [...tempEntries].reverse()) {
      try {
        if (entry.applied) {
          await removePathBestEffort(entry.path);
        }
        if (entry.backupCreated) {
          entry.backupCreated = !(await restoreBackupPath(entry));
        }
      } catch {
        // Best-effort rollback. The caller still fails closed on the original error.
      }
      await removePathBestEffort(entry.tempPath);
      if (!entry.backupCreated) {
        await removePathBestEffort(entry.backupPath);
      }
    }
    throw error;
  }

  for (const entry of tempEntries) {
    if (entry.backupCreated) {
      await removePathBestEffort(entry.backupPath);
    }
  }
}
