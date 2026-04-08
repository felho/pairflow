import { randomUUID } from "node:crypto";
import { copyFile, mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";

import type { ArchiveManifest } from "../../../../types/archive.js";
import { archiveSchemaVersion } from "../../../../types/archive.js";
import {
  FileLockTimeoutError,
  withFileLock
} from "../../foundation/fs/fileLock.js";
import { pathExists } from "../../foundation/fs/pathExists.js";
import {
  isIsoTimestamp,
  isNonEmptyString,
  isRecord
} from "../../../shared/validation/primitives.js";
import { resolveArchivePaths } from "./archivePaths.js";

const archiveManifestFileName = "archive-manifest.json";
const archiveLockTimeoutMs = 5_000;
const archiveLockPollMs = 25;

interface ArchiveSourceFile {
  sourcePath: string;
  archiveRelativePath: string;
  required: boolean;
}

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

interface ArchiveSnapshotErrorContext {
  archivePath?: string | undefined;
  archiveRelativePath?: string | undefined;
  archiveRootPath?: string | undefined;
  bubbleDir?: string | undefined;
  bubbleId?: string | undefined;
  bubbleInstanceId?: string | undefined;
  field?: string | undefined;
  lockPath?: string | undefined;
  manifestPath?: string | undefined;
  reason?: string | undefined;
  required?: boolean | undefined;
  sourcePath?: string | undefined;
}

interface ArchiveSnapshotErrorOptions extends ErrorOptions {
  context?: ArchiveSnapshotErrorContext | undefined;
}

export class ArchiveSnapshotError extends Error {
  public readonly context?: ArchiveSnapshotErrorContext | undefined;

  public constructor(message: string, options?: ArchiveSnapshotErrorOptions) {
    super(message, options);
    this.name = "ArchiveSnapshotError";
    this.context = options?.context;
  }
}

export class ArchiveSnapshotLockError extends ArchiveSnapshotError {
  public constructor(message: string, options?: ArchiveSnapshotErrorOptions) {
    super(message, options);
    this.name = "ArchiveSnapshotLockError";
  }
}

export class ArchivePathCollisionError extends ArchiveSnapshotError {
  public constructor(message: string, options?: ArchiveSnapshotErrorOptions) {
    super(message, options);
    this.name = "ArchivePathCollisionError";
  }
}

function parseArchiveManifest(raw: string): ArchiveManifest {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new ArchiveSnapshotError(`Invalid archive manifest JSON: ${reason}`, {
      context: {
        reason: "invalid_json"
      }
    });
  }

  if (!isRecord(parsed)) {
    throw new ArchiveSnapshotError("Archive manifest must be a JSON object.", {
      context: {
        reason: "not_a_json_object"
      }
    });
  }

  if (parsed.schema_version !== archiveSchemaVersion) {
    throw new ArchiveSnapshotError(
      `Archive manifest schema_version must be ${archiveSchemaVersion}.`,
      {
        context: {
          field: "schema_version",
          reason: "unsupported_schema_version"
        }
      }
    );
  }

  const fields: Array<keyof ArchiveManifest> = [
    "archived_at",
    "repo_path",
    "repo_key",
    "bubble_instance_id",
    "bubble_id",
    "source_bubble_dir"
  ];
  for (const field of fields) {
    if (!isNonEmptyString(parsed[field])) {
      throw new ArchiveSnapshotError(
        `Archive manifest ${field} must be a non-empty string.`,
        {
          context: {
            field,
            reason: "missing_non_empty_string"
          }
        }
      );
    }
  }

  if (!isIsoTimestamp(parsed.archived_at)) {
    throw new ArchiveSnapshotError(
      "Archive manifest archived_at must be an ISO-8601 UTC timestamp.",
      {
        context: {
          field: "archived_at",
          reason: "invalid_timestamp"
        }
      }
    );
  }

  if (!Array.isArray(parsed.archived_files)) {
    throw new ArchiveSnapshotError("Archive manifest archived_files must be an array.", {
      context: {
        field: "archived_files",
        reason: "not_an_array"
      }
    });
  }
  for (const [index, value] of parsed.archived_files.entries()) {
    if (!isNonEmptyString(value)) {
      throw new ArchiveSnapshotError(
        `Archive manifest archived_files[${index}] must be a non-empty string.`,
        {
          context: {
            field: "archived_files",
            reason: "missing_non_empty_string",
            archiveRelativePath: String(index)
          }
        }
      );
    }
  }

  return {
    schema_version: archiveSchemaVersion,
    archived_at: parsed.archived_at,
    repo_path: parsed.repo_path as string,
    repo_key: parsed.repo_key as string,
    bubble_instance_id: parsed.bubble_instance_id as string,
    bubble_id: parsed.bubble_id as string,
    source_bubble_dir: parsed.source_bubble_dir as string,
    archived_files: parsed.archived_files as string[]
  };
}

async function loadAndValidateExistingManifest(input: {
  archivePath: string;
  bubbleInstanceId: string;
  normalizedRepoPath: string;
}): Promise<ArchiveManifest> {
  const manifestPath = join(input.archivePath, archiveManifestFileName);
  const raw = await readFile(manifestPath, "utf8");
  const manifest = parseArchiveManifest(raw);

  if (
    manifest.bubble_instance_id !== input.bubbleInstanceId ||
    manifest.repo_path !== input.normalizedRepoPath
  ) {
    throw new ArchivePathCollisionError(
      `ARCHIVE_PATH_COLLISION: context archivePath=${input.archivePath}; archive instance path belongs to bubble_instance_id=${manifest.bubble_instance_id}, repo_path=${manifest.repo_path}; expected bubble_instance_id=${input.bubbleInstanceId}, repo_path=${input.normalizedRepoPath}`
      ,
      {
        context: {
          archivePath: input.archivePath,
          bubbleInstanceId: input.bubbleInstanceId,
          reason: "archive_path_collision"
        }
      }
    );
  }

  return manifest;
}

function archiveSourceFiles(bubbleDir: string): ArchiveSourceFile[] {
  return [
    {
      sourcePath: join(bubbleDir, "bubble.toml"),
      archiveRelativePath: "bubble.toml",
      required: true
    },
    {
      sourcePath: join(bubbleDir, "state.json"),
      archiveRelativePath: "state.json",
      required: true
    },
    {
      sourcePath: join(bubbleDir, "transcript.ndjson"),
      archiveRelativePath: "transcript.ndjson",
      required: true
    },
    {
      sourcePath: join(bubbleDir, "inbox.ndjson"),
      archiveRelativePath: "inbox.ndjson",
      required: true
    },
    {
      sourcePath: join(bubbleDir, "artifacts", "task.md"),
      archiveRelativePath: "artifacts/task.md",
      required: false
    }
  ];
}

function resolveArchiveFilePath(rootPath: string, relativePath: string): string {
  return join(rootPath, relativePath);
}

async function copyArchiveSourceFiles(input: {
  archivePath: string;
  bubbleDir: string;
  bubbleId: string;
  bubbleInstanceId: string;
  stagingPath: string;
}): Promise<string[]> {
  const archivedFiles: string[] = [];
  for (const source of archiveSourceFiles(resolve(input.bubbleDir))) {
    const exists = await pathExists(source.sourcePath);
    if (!exists) {
      if (source.required) {
        throw new ArchiveSnapshotError(
          `Required archive source file is missing: ${source.sourcePath}`,
          {
            context: {
              archivePath: input.archivePath,
              archiveRelativePath: source.archiveRelativePath,
              bubbleDir: input.bubbleDir,
              bubbleId: input.bubbleId,
              bubbleInstanceId: input.bubbleInstanceId,
              reason: "required_source_missing",
              required: true,
              sourcePath: source.sourcePath
            }
          }
        );
      }
      continue;
    }

    const archiveFilePath = resolveArchiveFilePath(
      input.stagingPath,
      source.archiveRelativePath
    );
    await mkdir(dirname(archiveFilePath), { recursive: true });
    await copyFile(source.sourcePath, archiveFilePath);
    archivedFiles.push(source.archiveRelativePath);
  }
  return archivedFiles;
}

async function createArchiveSnapshotInStaging(input: {
  archivePath: string;
  archivePaths: Awaited<ReturnType<typeof resolveArchivePaths>>;
  bubbleDir: string;
  bubbleId: string;
  bubbleInstanceId: string;
  now?: Date | undefined;
  stagingPath: string;
}): Promise<CreateArchiveSnapshotResult> {
  try {
    const archivedFiles = await copyArchiveSourceFiles({
      archivePath: input.archivePath,
      bubbleDir: input.bubbleDir,
      bubbleId: input.bubbleId,
      bubbleInstanceId: input.bubbleInstanceId,
      stagingPath: input.stagingPath
    });

    const now = input.now ?? new Date();
    const manifest: ArchiveManifest = {
      schema_version: archiveSchemaVersion,
      archived_at: now.toISOString(),
      repo_path: input.archivePaths.normalizedRepoPath,
      repo_key: input.archivePaths.repoKey,
      bubble_instance_id: input.bubbleInstanceId,
      bubble_id: input.bubbleId,
      source_bubble_dir: resolve(input.bubbleDir),
      archived_files: archivedFiles
    };
    await writeFile(
      join(input.stagingPath, archiveManifestFileName),
      `${JSON.stringify(manifest, null, 2)}\n`,
      { encoding: "utf8" }
    );

    await rename(input.stagingPath, input.archivePath);
    return {
      archivePath: input.archivePath,
      manifest,
      reusedExisting: false
    };
  } catch (error) {
    await rm(input.stagingPath, {
      recursive: true,
      force: true
    }).catch(() => undefined);
    throw error;
  }
}

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

        const stagingPath = join(
          archivePaths.repoArchiveRootPath,
          `.tmp-${input.bubbleInstanceId}-${randomUUID()}`
        );
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

export async function readArchiveManifest(path: string): Promise<ArchiveManifest> {
  const raw = await readFile(path, "utf8");
  return parseArchiveManifest(raw);
}
