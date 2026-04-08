import { mkdir } from "node:fs/promises";
import { join } from "node:path";

import type { ArchiveManifest } from "../../../../types/archive.js";
import {
  FileLockTimeoutError,
  withFileLock
} from "../../foundation/fs/fileLock.js";
import { pathExists } from "../../foundation/fs/pathExists.js";
import { resolveArchivePaths } from "./archivePaths.js";
import {
  buildArchiveSnapshotStagingPath,
  createArchiveSnapshotInStaging
} from "./archiveSnapshotFiles.js";
import {
  ArchiveSnapshotError,
  ArchiveSnapshotLockError
} from "./archiveSnapshotErrors.js";
import { loadAndValidateExistingManifest } from "./archiveSnapshotManifest.js";

const archiveLockTimeoutMs = 5_000;
const archiveLockPollMs = 25;

export interface CreateArchiveSnapshotInput {
  repoPath: string;
  bubbleId: string;
  bubbleInstanceId: string;
  bubbleDir: string;
  locksDir: string;
  now?: Date | undefined;
  archiveRootPath?: string | undefined;
}

export interface CreateArchiveSnapshotResult {
  archivePath: string;
  manifest: ArchiveManifest;
  reusedExisting: boolean;
}

export {
  ArchiveSnapshotError,
  ArchiveSnapshotLockError,
  ArchivePathCollisionError
} from "./archiveSnapshotErrors.js";
export { readArchiveManifest } from "./archiveSnapshotManifest.js";

export async function createArchiveSnapshot(
  input: CreateArchiveSnapshotInput
): Promise<CreateArchiveSnapshotResult> {
  const archivePaths = await resolveArchivePaths({
    repoPath: input.repoPath,
    bubbleInstanceId: input.bubbleInstanceId,
    ...(input.archiveRootPath !== undefined
      ? { archiveRootPath: input.archiveRootPath }
      : {})
  });
  const archivePath = archivePaths.bubbleInstanceArchivePath;
  const lockPath = join(input.locksDir, `archive-${input.bubbleInstanceId}.lock`);

  try {
    return await withFileLock(
      {
        lockPath,
        timeoutMs: archiveLockTimeoutMs,
        pollMs: archiveLockPollMs,
        ensureParentDir: true
      },
      async () => {
        if (await pathExists(archivePath)) {
          const manifest = await loadAndValidateExistingManifest({
            archivePath,
            bubbleInstanceId: input.bubbleInstanceId,
            normalizedRepoPath: archivePaths.normalizedRepoPath
          });
          return {
            archivePath,
            manifest,
            reusedExisting: true
          };
        }

        await mkdir(archivePaths.repoArchiveRootPath, { recursive: true });

        const stagingPath = buildArchiveSnapshotStagingPath({
          repoArchiveRootPath: archivePaths.repoArchiveRootPath,
          bubbleInstanceId: input.bubbleInstanceId
        });
        await mkdir(stagingPath, { recursive: true });
        return createArchiveSnapshotInStaging({
          archivePath,
          archivePaths,
          bubbleDir: input.bubbleDir,
          bubbleId: input.bubbleId,
          bubbleInstanceId: input.bubbleInstanceId,
          now: input.now,
          stagingPath
        });
      }
    );
  } catch (error) {
    if (error instanceof FileLockTimeoutError) {
      throw new ArchiveSnapshotLockError(
        `Could not acquire archive snapshot lock: ${lockPath}`,
        {
          context: {
            bubbleId: input.bubbleId,
            bubbleInstanceId: input.bubbleInstanceId,
            lockPath,
            reason: "lock_timeout"
          }
        }
      );
    }
    if (error instanceof ArchiveSnapshotError) {
      throw error;
    }
    const reason = error instanceof Error ? error.message : String(error);
    throw new ArchiveSnapshotError(
      `Failed to create archive snapshot for bubble ${input.bubbleId} (${input.bubbleInstanceId}): ${reason}`,
      {
        context: {
          archivePath,
          archiveRootPath: archivePaths.repoArchiveRootPath,
          bubbleDir: input.bubbleDir,
          bubbleId: input.bubbleId,
          bubbleInstanceId: input.bubbleInstanceId,
          lockPath,
          reason: "create_failed"
        },
        cause: error
      }
    );
  }
}
