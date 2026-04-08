import { randomUUID } from "node:crypto";
import { copyFile, mkdir, rename, rm, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";

import type { ArchiveManifest } from "../../../../types/archive.js";
import { archiveSchemaVersion } from "../../../../types/archive.js";
import { pathExists } from "../../foundation/fs/pathExists.js";
import { ArchiveSnapshotError } from "./archiveSnapshotErrors.js";
import { getArchiveManifestFileName } from "./archiveSnapshotManifest.js";
import type { resolveArchivePaths } from "./archivePaths.js";

interface ArchiveSourceFile {
  sourcePath: string;
  archiveRelativePath: string;
  required: boolean;
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

export async function createArchiveSnapshotInStaging(input: {
  archivePath: string;
  archivePaths: Awaited<ReturnType<typeof resolveArchivePaths>>;
  bubbleDir: string;
  bubbleId: string;
  bubbleInstanceId: string;
  now?: Date | undefined;
  stagingPath: string;
}): Promise<{
  archivePath: string;
  manifest: ArchiveManifest;
  reusedExisting: false;
}> {
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
      join(input.stagingPath, getArchiveManifestFileName()),
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

export function buildArchiveSnapshotStagingPath(input: {
  repoArchiveRootPath: string;
  bubbleInstanceId: string;
}): string {
  return join(
    input.repoArchiveRootPath,
    `.tmp-${input.bubbleInstanceId}-${randomUUID()}`
  );
}
