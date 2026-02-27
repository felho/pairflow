import { randomUUID } from "node:crypto";
import { dirname, join, resolve } from "node:path";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";

import type { ArchiveIndexDocument, ArchiveIndexEntry, ArchiveStatus } from "../../types/archive.js";
import { archiveSchemaVersion, archiveStatuses } from "../../types/archive.js";
import { FileLockTimeoutError, withFileLock } from "../util/fileLock.js";
import { isIsoTimestamp, isNonEmptyString, isRecord } from "../validation.js";
import { resolveArchivePaths } from "./archivePaths.js";

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

export class ArchiveIndexError extends Error {
  public constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "ArchiveIndexError";
  }
}

export class ArchiveIndexLockError extends ArchiveIndexError {
  public constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "ArchiveIndexLockError";
  }
}

function isArchiveStatus(value: unknown): value is ArchiveStatus {
  return (
    typeof value === "string" &&
    (archiveStatuses as readonly string[]).includes(value)
  );
}

function requireEntryString(
  value: Record<string, unknown>,
  field: keyof ArchiveIndexEntry,
  index: number
): string {
  const candidate = value[field];
  if (!isNonEmptyString(candidate)) {
    throw new ArchiveIndexError(
      `archive index entry ${index} ${field} must be a non-empty string.`
    );
  }
  return candidate;
}

function assertTimestampOrNull(
  value: unknown,
  field: string,
  index: number
): string | null {
  if (value === null || value === undefined) {
    return null;
  }
  if (!isNonEmptyString(value) || !isIsoTimestamp(value)) {
    throw new ArchiveIndexError(
      `archive index entry ${index} ${field} must be null or an ISO-8601 UTC timestamp.`
    );
  }
  return value;
}

function parseArchiveIndex(raw: string): ArchiveIndexDocument {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new ArchiveIndexError(`Invalid archive index JSON: ${reason}`);
  }

  if (!isRecord(parsed)) {
    throw new ArchiveIndexError("Archive index must be a JSON object.");
  }

  if (parsed.schema_version !== archiveSchemaVersion) {
    throw new ArchiveIndexError(
      `Unsupported archive index schema_version: ${String(parsed.schema_version)}.`
    );
  }

  if (!Array.isArray(parsed.entries)) {
    throw new ArchiveIndexError("Archive index entries must be an array.");
  }

  const entries = parsed.entries.map((value, index): ArchiveIndexEntry => {
    if (!isRecord(value)) {
      throw new ArchiveIndexError(`archive index entry ${index} must be an object.`);
    }

    const bubbleInstanceId = requireEntryString(value, "bubble_instance_id", index);
    const bubbleId = requireEntryString(value, "bubble_id", index);
    const repoPath = requireEntryString(value, "repo_path", index);
    const repoKey = requireEntryString(value, "repo_key", index);
    const archivePath = requireEntryString(value, "archive_path", index);
    const updatedAt = requireEntryString(value, "updated_at", index);

    if (!isArchiveStatus(value.status)) {
      throw new ArchiveIndexError(
        `archive index entry ${index} status must be one of: ${archiveStatuses.join("|")}.`
      );
    }

    if (!isIsoTimestamp(updatedAt)) {
      throw new ArchiveIndexError(
        `archive index entry ${index} updated_at must be an ISO-8601 UTC timestamp.`
      );
    }

    return {
      bubble_instance_id: bubbleInstanceId,
      bubble_id: bubbleId,
      repo_path: repoPath,
      repo_key: repoKey,
      archive_path: archivePath,
      status: value.status,
      created_at: assertTimestampOrNull(value.created_at, "created_at", index),
      deleted_at: assertTimestampOrNull(value.deleted_at, "deleted_at", index),
      purged_at: assertTimestampOrNull(value.purged_at, "purged_at", index),
      updated_at: updatedAt
    };
  });

  return {
    schema_version: archiveSchemaVersion,
    entries
  };
}

function compareDeletedDesc(left: string | null, right: string | null): number {
  if (left === right) {
    return 0;
  }
  if (left === null) {
    return 1;
  }
  if (right === null) {
    return -1;
  }
  return right.localeCompare(left);
}

function sortEntries(entries: ArchiveIndexEntry[]): ArchiveIndexEntry[] {
  return [...entries].sort((left, right) => {
    const byDeleted = compareDeletedDesc(left.deleted_at, right.deleted_at);
    if (byDeleted !== 0) {
      return byDeleted;
    }
    return left.bubble_instance_id.localeCompare(right.bubble_instance_id);
  });
}

function serializeArchiveIndex(entries: ArchiveIndexEntry[]): string {
  return `${JSON.stringify(
    {
      schema_version: archiveSchemaVersion,
      entries: sortEntries(entries)
    },
    null,
    2
  )}\n`;
}

async function readArchiveIndex(
  archiveIndexPath: string
): Promise<ArchiveIndexDocument> {
  const raw = await readFile(archiveIndexPath, "utf8").catch(
    (error: NodeJS.ErrnoException) => {
      if (error.code === "ENOENT") {
        return null;
      }
      throw error;
    }
  );
  if (raw === null) {
    return {
      schema_version: archiveSchemaVersion,
      entries: []
    };
  }
  return parseArchiveIndex(raw);
}

async function atomicWriteArchiveIndex(
  archiveIndexPath: string,
  entries: ArchiveIndexEntry[]
): Promise<void> {
  const parent = dirname(archiveIndexPath);
  await mkdir(parent, { recursive: true });

  const tempPath = join(parent, `.archive-index-${randomUUID()}.tmp`);
  try {
    await writeFile(tempPath, serializeArchiveIndex(entries), {
      encoding: "utf8"
    });
    await rename(tempPath, archiveIndexPath);
  } catch (error) {
    await rm(tempPath, { force: true }).catch(() => undefined);
    throw error;
  }
}

function normalizeCreatedAt(value: string | null | undefined): string | null {
  if (value === undefined || value === null) {
    return null;
  }
  if (!isIsoTimestamp(value)) {
    throw new ArchiveIndexError("createdAt must be an ISO-8601 UTC timestamp.");
  }
  return value;
}

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
        `Could not acquire archive index lock: ${lockPath}`
      );
    }
    if (error instanceof ArchiveIndexError) {
      throw error;
    }
    const reason = error instanceof Error ? error.message : String(error);
    throw new ArchiveIndexError(
      `Failed to update archive index for bubble ${input.bubbleId} (${input.bubbleInstanceId}): ${reason}`,
      {
        cause: error
      }
    );
  }
}
