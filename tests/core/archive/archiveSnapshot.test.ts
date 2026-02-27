import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { createBubble } from "../../../src/core/bubble/createBubble.js";
import {
  ArchivePathCollisionError,
  createArchiveSnapshot,
  readArchiveManifest
} from "../../../src/core/archive/archiveSnapshot.js";
import { resolveArchivePaths } from "../../../src/core/archive/archivePaths.js";
import { archiveSchemaVersion } from "../../../src/types/archive.js";
import { initGitRepository } from "../../helpers/git.js";

const tempDirs: string[] = [];

async function createTempDir(prefix: string): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), prefix));
  tempDirs.push(dir);
  return dir;
}

async function createTempRepo(): Promise<string> {
  const repoPath = await createTempDir("pairflow-archive-snapshot-repo-");
  await initGitRepository(repoPath);
  return repoPath;
}

afterEach(async () => {
  await Promise.all(
    tempDirs.splice(0).map((path) => rm(path, { recursive: true, force: true }))
  );
});

describe("createArchiveSnapshot", () => {
  it("archives core bubble files and writes manifest", async () => {
    const repoPath = await createTempRepo();
    const archiveRootPath = await createTempDir("pairflow-archive-snapshot-root-");
    const bubble = await createBubble({
      id: "b_archive_snapshot_01",
      repoPath,
      baseBranch: "main",
      task: "Archive snapshot task",
      cwd: repoPath
    });
    const now = new Date("2026-02-26T10:15:00.000Z");

    const result = await createArchiveSnapshot({
      repoPath,
      bubbleId: bubble.bubbleId,
      bubbleInstanceId: bubble.config.bubble_instance_id as string,
      bubbleDir: bubble.paths.bubbleDir,
      locksDir: bubble.paths.locksDir,
      archiveRootPath,
      now
    });

    expect(result.reusedExisting).toBe(false);

    const manifest = await readArchiveManifest(join(result.archivePath, "archive-manifest.json"));
    expect(manifest).toMatchObject({
      schema_version: archiveSchemaVersion,
      archived_at: now.toISOString(),
      repo_path: result.manifest.repo_path,
      bubble_instance_id: bubble.config.bubble_instance_id,
      bubble_id: bubble.bubbleId,
      source_bubble_dir: bubble.paths.bubbleDir
    });
    expect(manifest.archived_files).toEqual([
      "bubble.toml",
      "state.json",
      "transcript.ndjson",
      "inbox.ndjson",
      "artifacts/task.md"
    ]);

    await expect(readFile(join(result.archivePath, "bubble.toml"), "utf8")).resolves.toContain(
      `id = "${bubble.bubbleId}"`
    );
  });

  it("succeeds when optional artifacts/task.md is missing", async () => {
    const repoPath = await createTempRepo();
    const archiveRootPath = await createTempDir("pairflow-archive-snapshot-root-");
    const bubble = await createBubble({
      id: "b_archive_snapshot_02",
      repoPath,
      baseBranch: "main",
      task: "Archive without task artifact",
      cwd: repoPath
    });
    await rm(bubble.paths.taskArtifactPath, { force: true });

    const result = await createArchiveSnapshot({
      repoPath,
      bubbleId: bubble.bubbleId,
      bubbleInstanceId: bubble.config.bubble_instance_id as string,
      bubbleDir: bubble.paths.bubbleDir,
      locksDir: bubble.paths.locksDir,
      archiveRootPath
    });

    expect(result.manifest.archived_files).toEqual([
      "bubble.toml",
      "state.json",
      "transcript.ndjson",
      "inbox.ndjson"
    ]);
  });

  it("reuses an existing same-instance archive directory", async () => {
    const repoPath = await createTempRepo();
    const archiveRootPath = await createTempDir("pairflow-archive-snapshot-root-");
    const bubble = await createBubble({
      id: "b_archive_snapshot_03",
      repoPath,
      baseBranch: "main",
      task: "Archive idempotent retry",
      cwd: repoPath
    });

    const first = await createArchiveSnapshot({
      repoPath,
      bubbleId: bubble.bubbleId,
      bubbleInstanceId: bubble.config.bubble_instance_id as string,
      bubbleDir: bubble.paths.bubbleDir,
      locksDir: bubble.paths.locksDir,
      archiveRootPath
    });
    const second = await createArchiveSnapshot({
      repoPath,
      bubbleId: bubble.bubbleId,
      bubbleInstanceId: bubble.config.bubble_instance_id as string,
      bubbleDir: bubble.paths.bubbleDir,
      locksDir: bubble.paths.locksDir,
      archiveRootPath
    });

    expect(first.reusedExisting).toBe(false);
    expect(second.reusedExisting).toBe(true);
    expect(second.archivePath).toBe(first.archivePath);
  });

  it("fails with archive-path-collision when existing manifest identity mismatches", async () => {
    const repoPath = await createTempRepo();
    const archiveRootPath = await createTempDir("pairflow-archive-snapshot-root-");
    const bubble = await createBubble({
      id: "b_archive_snapshot_04",
      repoPath,
      baseBranch: "main",
      task: "Archive collision",
      cwd: repoPath
    });
    const bubbleInstanceId = bubble.config.bubble_instance_id as string;
    const archivePaths = await resolveArchivePaths({
      repoPath,
      bubbleInstanceId,
      archiveRootPath
    });
    await mkdir(archivePaths.bubbleInstanceArchivePath, { recursive: true });
    await writeFile(
      join(archivePaths.bubbleInstanceArchivePath, "archive-manifest.json"),
      `${JSON.stringify(
        {
          schema_version: archiveSchemaVersion,
          archived_at: "2026-02-26T10:20:00.000Z",
          repo_path: archivePaths.normalizedRepoPath,
          repo_key: archivePaths.repoKey,
          bubble_instance_id: "bi_other_identity",
          bubble_id: bubble.bubbleId,
          source_bubble_dir: bubble.paths.bubbleDir,
          archived_files: ["bubble.toml"]
        },
        null,
        2
      )}\n`,
      "utf8"
    );

    await expect(
      createArchiveSnapshot({
        repoPath,
        bubbleId: bubble.bubbleId,
        bubbleInstanceId,
        bubbleDir: bubble.paths.bubbleDir,
        locksDir: bubble.paths.locksDir,
        archiveRootPath
      })
    ).rejects.toBeInstanceOf(ArchivePathCollisionError);
  });
});
