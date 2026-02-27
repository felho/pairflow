import { randomUUID } from "node:crypto";
import { copyFile, mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";

import type { ArchiveManifest } from "../../types/archive.js";
import { archiveSchemaVersion } from "../../types/archive.js";
import { FileLockTimeoutError, withFileLock } from "../util/fileLock.js";
import { isIsoTimestamp, isNonEmptyString, isRecord } from "../validation.js";
import { pathExists } from "../util/pathExists.js";
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

export class ArchiveSnapshotError extends Error {
  public constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "ArchiveSnapshotError";
  }
}

export class ArchiveSnapshotLockError extends ArchiveSnapshotError {
  public constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "ArchiveSnapshotLockError";
  }
}

export class ArchivePathCollisionError extends ArchiveSnapshotError {
  public constructor(message: string, options?: ErrorOptions) {
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
    throw new ArchiveSnapshotError(`Invalid archive manifest JSON: ${reason}`);
  }

  if (!isRecord(parsed)) {
    throw new ArchiveSnapshotError("Archive manifest must be a JSON object.");
  }

  if (parsed.schema_version !== archiveSchemaVersion) {
    throw new ArchiveSnapshotError(
      `Archive manifest schema_version must be ${archiveSchemaVersion}.`
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
      throw new ArchiveSnapshotError(`Archive manifest ${field} must be a non-empty string.`);
    }
  }

  if (!isIsoTimestamp(parsed.archived_at)) {
    throw new ArchiveSnapshotError(
      "Archive manifest archived_at must be an ISO-8601 UTC timestamp."
    );
  }

  if (!Array.isArray(parsed.archived_files)) {
    throw new ArchiveSnapshotError("Archive manifest archived_files must be an array.");
  }
  for (const [index, value] of parsed.archived_files.entries()) {
    if (!isNonEmptyString(value)) {
      throw new ArchiveSnapshotError(
        `Archive manifest archived_files[${index}] must be a non-empty string.`
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

function asArchivePathCollisionError(input: {
  archivePath: string;
  expectedBubbleInstanceId: string;
  expectedRepoPath: string;
  foundBubbleInstanceId: string;
  foundRepoPath: string;
}): ArchivePathCollisionError {
  return new ArchivePathCollisionError(
    `archive-path-collision: archive instance path ${input.archivePath} belongs to bubble_instance_id=${input.foundBubbleInstanceId}, repo_path=${input.foundRepoPath}; expected bubble_instance_id=${input.expectedBubbleInstanceId}, repo_path=${input.expectedRepoPath}`
  );
}

async function loadAndValidateExistingManifest(input: {
  archivePath: string;
  bubbleInstanceId: string;
  normalizedRepoPath: string;
}): Promise<ArchiveManifest> {
  const manifestPath = join(input.archivePath, archiveManifestFileName);
  const rawManifest = await readFile(manifestPath, "utf8").catch(
    (error: NodeJS.ErrnoException) => {
      if (error.code === "ENOENT") {
        throw new ArchiveSnapshotError(
          `Archive directory exists but manifest is missing: ${manifestPath}`
        );
      }
      throw error;
    }
  );
  const manifest = parseArchiveManifest(rawManifest);

  if (
    manifest.bubble_instance_id !== input.bubbleInstanceId ||
    manifest.repo_path !== input.normalizedRepoPath
  ) {
    throw asArchivePathCollisionError({
      archivePath: input.archivePath,
      expectedBubbleInstanceId: input.bubbleInstanceId,
      expectedRepoPath: input.normalizedRepoPath,
      foundBubbleInstanceId: manifest.bubble_instance_id,
      foundRepoPath: manifest.repo_path
    });
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

        try {
          const archivedFiles: string[] = [];
          for (const source of archiveSourceFiles(resolve(input.bubbleDir))) {
            const exists = await pathExists(source.sourcePath);
            if (!exists) {
              if (source.required) {
                throw new ArchiveSnapshotError(
                  `Required archive source file is missing: ${source.sourcePath}`
                );
              }
              continue;
            }

            const archiveFilePath = resolveArchiveFilePath(
              stagingPath,
              source.archiveRelativePath
            );
            await mkdir(dirname(archiveFilePath), { recursive: true });
            await copyFile(source.sourcePath, archiveFilePath);
            archivedFiles.push(source.archiveRelativePath);
          }

          const now = input.now ?? new Date();
          const manifest: ArchiveManifest = {
            schema_version: archiveSchemaVersion,
            archived_at: now.toISOString(),
            repo_path: archivePaths.normalizedRepoPath,
            repo_key: archivePaths.repoKey,
            bubble_instance_id: input.bubbleInstanceId,
            bubble_id: input.bubbleId,
            source_bubble_dir: resolve(input.bubbleDir),
            archived_files: archivedFiles
          };
          await writeFile(
            join(stagingPath, archiveManifestFileName),
            `${JSON.stringify(manifest, null, 2)}\n`,
            { encoding: "utf8" }
          );

          await rename(stagingPath, archivePath);
          return {
            archivePath,
            manifest,
            reusedExisting: false
          };
        } catch (error) {
          await rm(stagingPath, {
            recursive: true,
            force: true
          }).catch(() => undefined);
          throw error;
        }
      }
    );
  } catch (error) {
    if (error instanceof FileLockTimeoutError) {
      throw new ArchiveSnapshotLockError(
        `Could not acquire archive snapshot lock: ${lockPath}`
      );
    }
    if (error instanceof ArchiveSnapshotError) {
      throw error;
    }
    const reason = error instanceof Error ? error.message : String(error);
    throw new ArchiveSnapshotError(
      `Failed to create archive snapshot for bubble ${input.bubbleId} (${input.bubbleInstanceId}): ${reason}`,
      {
        cause: error
      }
    );
  }
}

export async function readArchiveManifest(path: string): Promise<ArchiveManifest> {
  const raw = await readFile(path, "utf8");
  return parseArchiveManifest(raw);
}
