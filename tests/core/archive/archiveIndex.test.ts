import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { upsertDeletedArchiveIndexEntry } from "../../../src/core/archive/archiveIndex.js";
import { resolveArchivePaths } from "../../../src/core/archive/archivePaths.js";
import type { ArchiveIndexDocument } from "../../../src/types/archive.js";
import { archiveSchemaVersion } from "../../../src/types/archive.js";

const tempDirs: string[] = [];

async function createTempDir(prefix: string): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), prefix));
  tempDirs.push(dir);
  return dir;
}

async function readIndex(path: string): Promise<ArchiveIndexDocument> {
  return JSON.parse(await readFile(path, "utf8")) as ArchiveIndexDocument;
}

afterEach(async () => {
  await Promise.all(
    tempDirs.splice(0).map((path) => rm(path, { recursive: true, force: true }))
  );
});

describe("upsertDeletedArchiveIndexEntry", () => {
  it("creates archive index with schema and deleted entry", async () => {
    const archiveRootPath = await createTempDir("pairflow-archive-index-root-");
    const locksDir = await createTempDir("pairflow-archive-index-locks-");
    const now = new Date("2026-02-26T11:00:00.000Z");

    const paths = await resolveArchivePaths({
      repoPath: "/tmp/pairflow/repo-index-01",
      bubbleInstanceId: "bi_00m90f3f00_aaaaaaaaaaaaaaaaaaaa",
      archiveRootPath
    });

    const result = await upsertDeletedArchiveIndexEntry({
      repoPath: "/tmp/pairflow/repo-index-01",
      bubbleId: "b_archive_index_01",
      bubbleInstanceId: "bi_00m90f3f00_aaaaaaaaaaaaaaaaaaaa",
      archivePath: paths.bubbleInstanceArchivePath,
      locksDir,
      createdAt: null,
      now,
      archiveRootPath
    });

    expect(result.indexPath).toBe(paths.archiveIndexPath);
    const index = await readIndex(paths.archiveIndexPath);
    expect(index.schema_version).toBe(archiveSchemaVersion);
    expect(index.entries).toHaveLength(1);
    expect(index.entries[0]).toMatchObject({
      bubble_instance_id: "bi_00m90f3f00_aaaaaaaaaaaaaaaaaaaa",
      bubble_id: "b_archive_index_01",
      repo_path: paths.normalizedRepoPath,
      repo_key: paths.repoKey,
      archive_path: paths.bubbleInstanceArchivePath,
      status: "deleted",
      created_at: null,
      deleted_at: now.toISOString(),
      purged_at: null,
      updated_at: now.toISOString()
    });
  });

  it("upserts by bubble_instance_id without duplicates", async () => {
    const archiveRootPath = await createTempDir("pairflow-archive-index-root-");
    const locksDir = await createTempDir("pairflow-archive-index-locks-");
    const repoPath = "/tmp/pairflow/repo-index-02";
    const bubbleInstanceId = "bi_00m90f3f11_bbbbbbbbbbbbbbbbbbbb";
    const paths = await resolveArchivePaths({
      repoPath,
      bubbleInstanceId,
      archiveRootPath
    });

    await upsertDeletedArchiveIndexEntry({
      repoPath,
      bubbleId: "b_archive_index_02",
      bubbleInstanceId,
      archivePath: paths.bubbleInstanceArchivePath,
      locksDir,
      createdAt: "2026-02-20T09:00:00.000Z",
      now: new Date("2026-02-26T11:10:00.000Z"),
      archiveRootPath
    });

    await upsertDeletedArchiveIndexEntry({
      repoPath,
      bubbleId: "b_archive_index_02",
      bubbleInstanceId,
      archivePath: paths.bubbleInstanceArchivePath,
      locksDir,
      now: new Date("2026-02-26T11:15:00.000Z"),
      archiveRootPath
    });

    const index = await readIndex(paths.archiveIndexPath);
    expect(index.entries).toHaveLength(1);
    expect(index.entries[0]).toMatchObject({
      bubble_instance_id: bubbleInstanceId,
      status: "deleted",
      created_at: "2026-02-20T09:00:00.000Z",
      deleted_at: "2026-02-26T11:15:00.000Z"
    });
  });

  it("preserves existing null created_at even when retry input provides createdAt", async () => {
    const archiveRootPath = await createTempDir("pairflow-archive-index-root-");
    const locksDir = await createTempDir("pairflow-archive-index-locks-");
    const repoPath = "/tmp/pairflow/repo-index-02b";
    const bubbleInstanceId = "bi_00m90f3f12_bbbbbbbbbbbbbbbbbbb1";
    const paths = await resolveArchivePaths({
      repoPath,
      bubbleInstanceId,
      archiveRootPath
    });
    await writeFile(
      paths.archiveIndexPath,
      `${JSON.stringify(
        {
          schema_version: 1,
          entries: [
            {
              bubble_instance_id: bubbleInstanceId,
              bubble_id: "b_archive_index_02b",
              repo_path: paths.normalizedRepoPath,
              repo_key: paths.repoKey,
              archive_path: paths.bubbleInstanceArchivePath,
              status: "active",
              created_at: null,
              updated_at: "2026-02-26T11:12:00.000Z"
            }
          ]
        },
        null,
        2
      )}\n`,
      "utf8"
    );

    await upsertDeletedArchiveIndexEntry({
      repoPath,
      bubbleId: "b_archive_index_02b",
      bubbleInstanceId,
      archivePath: paths.bubbleInstanceArchivePath,
      locksDir,
      createdAt: "2026-02-20T09:00:00.000Z",
      now: new Date("2026-02-26T11:16:00.000Z"),
      archiveRootPath
    });

    const index = await readIndex(paths.archiveIndexPath);
    expect(index.entries).toHaveLength(1);
    expect(index.entries[0]).toMatchObject({
      bubble_instance_id: bubbleInstanceId,
      status: "deleted",
      created_at: null,
      deleted_at: "2026-02-26T11:16:00.000Z"
    });
  });

  it("sorts entries by deleted_at desc then bubble_instance_id asc", async () => {
    const archiveRootPath = await createTempDir("pairflow-archive-index-root-");
    const locksDir = await createTempDir("pairflow-archive-index-locks-");
    const repoPath = "/tmp/pairflow/repo-index-03";

    const ids = [
      "bi_00m90f3f20_cccccccccccccccccccc",
      "bi_00m90f3f21_dddddddddddddddddddd",
      "bi_00m90f3f22_eeeeeeeeeeeeeeeeeeee"
    ] as const;

    await upsertDeletedArchiveIndexEntry({
      repoPath,
      bubbleId: "b_archive_index_03a",
      bubbleInstanceId: ids[0],
      archivePath: `/tmp/archive/${ids[0]}`,
      locksDir,
      now: new Date("2026-02-26T11:20:00.000Z"),
      archiveRootPath
    });
    await upsertDeletedArchiveIndexEntry({
      repoPath,
      bubbleId: "b_archive_index_03b",
      bubbleInstanceId: ids[1],
      archivePath: `/tmp/archive/${ids[1]}`,
      locksDir,
      now: new Date("2026-02-26T11:30:00.000Z"),
      archiveRootPath
    });
    await upsertDeletedArchiveIndexEntry({
      repoPath,
      bubbleId: "b_archive_index_03c",
      bubbleInstanceId: ids[2],
      archivePath: `/tmp/archive/${ids[2]}`,
      locksDir,
      now: new Date("2026-02-26T11:30:00.000Z"),
      archiveRootPath
    });

    const paths = await resolveArchivePaths({
      repoPath,
      bubbleInstanceId: ids[0],
      archiveRootPath
    });
    const index = await readIndex(paths.archiveIndexPath);
    expect(index.entries.map((entry) => entry.bubble_instance_id)).toEqual([
      ids[1],
      ids[2],
      ids[0]
    ]);
  });

  it("treats missing nullable timestamp keys as null when reading existing index", async () => {
    const archiveRootPath = await createTempDir("pairflow-archive-index-root-");
    const locksDir = await createTempDir("pairflow-archive-index-locks-");
    const repoPath = "/tmp/pairflow/repo-index-04";
    const bubbleInstanceId = "bi_00m90f3f30_ffffffffffffffffffff";
    const paths = await resolveArchivePaths({
      repoPath,
      bubbleInstanceId,
      archiveRootPath
    });
    await writeFile(
      paths.archiveIndexPath,
      `${JSON.stringify(
        {
          schema_version: 1,
          entries: [
            {
              bubble_instance_id: bubbleInstanceId,
              bubble_id: "b_archive_index_04",
              repo_path: paths.normalizedRepoPath,
              repo_key: paths.repoKey,
              archive_path: paths.bubbleInstanceArchivePath,
              status: "active",
              updated_at: "2026-02-26T11:35:00.000Z"
            }
          ]
        },
        null,
        2
      )}\n`,
      "utf8"
    );

    await expect(
      upsertDeletedArchiveIndexEntry({
        repoPath,
        bubbleId: "b_archive_index_04",
        bubbleInstanceId,
        archivePath: paths.bubbleInstanceArchivePath,
        locksDir,
        now: new Date("2026-02-26T11:40:00.000Z"),
        archiveRootPath
      })
    ).resolves.toBeDefined();

    const index = await readIndex(paths.archiveIndexPath);
    expect(index.entries).toHaveLength(1);
    expect(index.entries[0]).toMatchObject({
      bubble_instance_id: bubbleInstanceId,
      status: "deleted",
      created_at: null,
      deleted_at: "2026-02-26T11:40:00.000Z",
      purged_at: null
    });
  });

  it("rejects whitespace-only index files as invalid JSON", async () => {
    const archiveRootPath = await createTempDir("pairflow-archive-index-root-");
    const locksDir = await createTempDir("pairflow-archive-index-locks-");
    const repoPath = "/tmp/pairflow/repo-index-05";
    const bubbleInstanceId = "bi_00m90f3f31_gggggggggggggggggggg";
    const paths = await resolveArchivePaths({
      repoPath,
      bubbleInstanceId,
      archiveRootPath
    });
    await writeFile(paths.archiveIndexPath, "  \n\t", "utf8");

    await expect(
      upsertDeletedArchiveIndexEntry({
        repoPath,
        bubbleId: "b_archive_index_05",
        bubbleInstanceId,
        archivePath: paths.bubbleInstanceArchivePath,
        locksDir,
        now: new Date("2026-02-26T11:45:00.000Z"),
        archiveRootPath
      })
    ).rejects.toThrow(/Invalid archive index JSON/u);
  });

  it("rejects zero-byte index files as invalid JSON", async () => {
    const archiveRootPath = await createTempDir("pairflow-archive-index-root-");
    const locksDir = await createTempDir("pairflow-archive-index-locks-");
    const repoPath = "/tmp/pairflow/repo-index-06";
    const bubbleInstanceId = "bi_00m90f3f32_hhhhhhhhhhhhhhhhhhhh";
    const paths = await resolveArchivePaths({
      repoPath,
      bubbleInstanceId,
      archiveRootPath
    });
    await writeFile(paths.archiveIndexPath, "", "utf8");

    await expect(
      upsertDeletedArchiveIndexEntry({
        repoPath,
        bubbleId: "b_archive_index_06",
        bubbleInstanceId,
        archivePath: paths.bubbleInstanceArchivePath,
        locksDir,
        now: new Date("2026-02-26T11:46:00.000Z"),
        archiveRootPath
      })
    ).rejects.toThrow(/Invalid archive index JSON/u);
  });
});
