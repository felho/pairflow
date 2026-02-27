import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import { createBubble } from "../../../src/core/bubble/createBubble.js";
import { initGitRepository } from "../../helpers/git.js";

const tempDirs: string[] = [];

async function createTempDir(prefix: string): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), prefix));
  tempDirs.push(dir);
  return dir;
}

async function createTempRepo(): Promise<string> {
  const repoPath = await createTempDir("pairflow-archive-locks-repo-");
  await initGitRepository(repoPath);
  return repoPath;
}

afterEach(async () => {
  vi.doUnmock("../../../src/core/util/fileLock.js");
  vi.resetModules();
  await Promise.all(
    tempDirs.splice(0).map((path) => rm(path, { recursive: true, force: true }))
  );
});

describe("archive locking", () => {
  it("uses 5000ms timeout and 25ms poll for snapshot and index locks", async () => {
    vi.resetModules();
    const withFileLockMock = vi.fn(async (_options: unknown, task: () => Promise<unknown>) =>
      task()
    );
    class MockFileLockTimeoutError extends Error {}
    vi.doMock("../../../src/core/util/fileLock.js", () => ({
      withFileLock: withFileLockMock,
      FileLockTimeoutError: MockFileLockTimeoutError
    }));

    const { createArchiveSnapshot } = await import(
      "../../../src/core/archive/archiveSnapshot.js"
    );
    const { upsertDeletedArchiveIndexEntry } = await import(
      "../../../src/core/archive/archiveIndex.js"
    );

    const repoPath = await createTempRepo();
    const archiveRootPath = await createTempDir("pairflow-archive-locks-root-");
    const bubble = await createBubble({
      id: "b_archive_locking_01",
      repoPath,
      baseBranch: "main",
      task: "Archive locking test",
      cwd: repoPath
    });

    await createArchiveSnapshot({
      repoPath,
      bubbleId: bubble.bubbleId,
      bubbleInstanceId: bubble.config.bubble_instance_id as string,
      bubbleDir: bubble.paths.bubbleDir,
      locksDir: bubble.paths.locksDir,
      archiveRootPath
    });

    await upsertDeletedArchiveIndexEntry({
      repoPath,
      bubbleId: bubble.bubbleId,
      bubbleInstanceId: bubble.config.bubble_instance_id as string,
      archivePath: join(archiveRootPath, "placeholder"),
      locksDir: bubble.paths.locksDir,
      archiveRootPath
    });

    expect(withFileLockMock).toHaveBeenCalled();
    expect(withFileLockMock).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        lockPath: join(
          bubble.paths.locksDir,
          `archive-${bubble.config.bubble_instance_id as string}.lock`
        ),
        timeoutMs: 5_000,
        pollMs: 25
      }),
      expect.any(Function)
    );
    expect(withFileLockMock).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        lockPath: join(bubble.paths.locksDir, "archive-index.lock"),
        timeoutMs: 5_000,
        pollMs: 25
      }),
      expect.any(Function)
    );
  });

  it("maps lock timeout to snapshot/index lock-specific errors", async () => {
    vi.resetModules();
    class MockFileLockTimeoutError extends Error {}
    const withFileLockMock = vi.fn(() => {
      throw new MockFileLockTimeoutError("timeout");
    });
    vi.doMock("../../../src/core/util/fileLock.js", () => ({
      withFileLock: withFileLockMock,
      FileLockTimeoutError: MockFileLockTimeoutError
    }));

    const { createArchiveSnapshot } = await import(
      "../../../src/core/archive/archiveSnapshot.js"
    );
    const { upsertDeletedArchiveIndexEntry } = await import(
      "../../../src/core/archive/archiveIndex.js"
    );

    await expect(
      createArchiveSnapshot({
        repoPath: "/tmp/repo",
        bubbleId: "b_archive_locking_02",
        bubbleInstanceId: "bi_00m91csy00_locktimeout0000000",
        bubbleDir: "/tmp/repo/.pairflow/bubbles/b_archive_locking_02",
        locksDir: "/tmp/repo/.pairflow/locks",
        archiveRootPath: "/tmp/archive"
      })
    ).rejects.toMatchObject({
      name: "ArchiveSnapshotLockError"
    });

    await expect(
      upsertDeletedArchiveIndexEntry({
        repoPath: "/tmp/repo",
        bubbleId: "b_archive_locking_02",
        bubbleInstanceId: "bi_00m91csy00_locktimeout0000000",
        archivePath: "/tmp/archive/fake",
        locksDir: "/tmp/repo/.pairflow/locks",
        archiveRootPath: "/tmp/archive"
      })
    ).rejects.toMatchObject({
      name: "ArchiveIndexLockError"
    });
  });
});
