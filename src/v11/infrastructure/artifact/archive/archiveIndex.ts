import { join, resolve } from "node:path";

import type { ArchiveIndexEntry } from "../../../../types/archive.js";
import {
  FileLockTimeoutError,
  withFileLock
} from "../../foundation/fs/fileLock.js";
import {
  ArchiveIndexError,
  ArchiveIndexLockError
} from "./archiveIndexErrors.js";
import { resolveArchivePaths } from "./archivePaths.js";
import {
  normalizeCreatedAt
} from "./archiveIndexDocument.js";
import {
  atomicWriteArchiveIndex,
  readArchiveIndex
} from "./archiveIndexPersistence.js";

const archiveIndexLockTimeoutMs = 5_000;
const archiveIndexLockPollMs = 25;

export interface UpsertDeletedArchiveIndexEntryInput {
  repoPath: string;
  bubbleId: string;
  bubbleInstanceId: string;
  archivePath: string;
  locksDir: string;
  createdAt?: string | null | undefined;
  now?: Date | undefined;
  archiveRootPath?: string | undefined;
}

export interface UpsertDeletedArchiveIndexEntryResult {
  indexPath: string;
  entry: ArchiveIndexEntry;
}

export { ArchiveIndexError, ArchiveIndexLockError } from "./archiveIndexErrors.js";


export async function upsertDeletedArchiveIndexEntry(
  input: UpsertDeletedArchiveIndexEntryInput
): Promise<UpsertDeletedArchiveIndexEntryResult> {
  const nowIso = (input.now ?? new Date()).toISOString();
  const createdAt = normalizeCreatedAt(input.createdAt);
  const archivePath = resolve(input.archivePath);

  const archivePaths = await resolveArchivePaths({
    repoPath: input.repoPath,
    bubbleInstanceId: input.bubbleInstanceId,
    ...(input.archiveRootPath !== undefined
      ? { archiveRootPath: input.archiveRootPath }
      : {})
  });
  const lockPath = join(input.locksDir, "archive-index.lock");

  try {
    return await withFileLock(
      {
        lockPath,
        timeoutMs: archiveIndexLockTimeoutMs,
        pollMs: archiveIndexLockPollMs,
        ensureParentDir: true
      },
      async () => {
        const index = await readArchiveIndex(archivePaths.archiveIndexPath);
        const existingIndex = index.entries.findIndex(
          (entry) => entry.bubble_instance_id === input.bubbleInstanceId
        );
        const nextEntries = [...index.entries];
        const existingEntry =
          existingIndex >= 0 ? index.entries[existingIndex] : undefined;

        const entry: ArchiveIndexEntry = {
          bubble_instance_id: input.bubbleInstanceId,
          bubble_id: input.bubbleId,
          repo_path: archivePaths.normalizedRepoPath,
          repo_key: archivePaths.repoKey,
          archive_path: archivePath,
          status: "deleted",
          created_at:
            existingEntry === undefined ? createdAt : existingEntry.created_at,
          deleted_at: nowIso,
          purged_at: null,
          updated_at: nowIso
        };

        if (existingIndex >= 0) {
          nextEntries[existingIndex] = entry;
        } else {
          nextEntries.push(entry);
        }

        await atomicWriteArchiveIndex(archivePaths.archiveIndexPath, nextEntries);
        return {
          indexPath: archivePaths.archiveIndexPath,
          entry
        };
      }
    );
  } catch (error) {
    if (error instanceof FileLockTimeoutError) {
      throw new ArchiveIndexLockError(
        `Could not acquire archive index lock: ${lockPath}`,
        {
          context: {
            lockPath,
            reason: "lock_timeout"
          }
        }
      );
    }
    if (error instanceof ArchiveIndexError) {
      throw error;
    }
    const reason = error instanceof Error ? error.message : String(error);
    throw new ArchiveIndexError(
      `Failed to update archive index for bubble ${input.bubbleId} (${input.bubbleInstanceId}): ${reason}`,
      {
        context: {
          archiveIndexPath: archivePaths.archiveIndexPath,
          archivePath,
          bubbleId: input.bubbleId,
          bubbleInstanceId: input.bubbleInstanceId,
          lockPath,
          reason: "update_failed"
        },
        cause: error
      }
    );
  }
}
