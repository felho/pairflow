import { mkdtemp, readFile, rm, utimes, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  clearStaleRecoveryMisconfigurationWarnings,
  FileLockTimeoutError,
  withFileLock
} from "../../../../../src/v11/infrastructure/foundation/fs/fileLock.js";

const tempDirs: string[] = [];

async function createTempDir(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "pairflow-v11-file-lock-"));
  tempDirs.push(root);
  return root;
}

async function setStaleMtime(path: string): Promise<void> {
  const staleTime = new Date(Date.now() - 10_000);
  await utimes(path, staleTime, staleTime);
}

afterEach(async () => {
  clearStaleRecoveryMisconfigurationWarnings();
  await Promise.all(
    tempDirs.splice(0).map((path) => rm(path, { recursive: true, force: true }))
  );
});

describe("v11 fileLock", () => {
  it("recovers legacy stale lock files and proceeds", async () => {
    const root = await createTempDir();
    const lockPath = join(root, "events.ndjson.lock");

    await writeFile(lockPath, "", "utf8");
    await setStaleMtime(lockPath);

    let executed = false;
    await withFileLock(
      {
        lockPath,
        timeoutMs: 120,
        pollMs: 5,
        staleAfterMs: 20
      },
      async () => {
        executed = true;
      }
    );

    expect(executed).toBe(true);
    await expect(readFile(lockPath, "utf8")).rejects.toMatchObject({
      code: "ENOENT"
    });
  });

  it("times out when the stale-looking lock is still owned by a live pid", async () => {
    const root = await createTempDir();
    const lockPath = join(root, "events.ndjson.lock");

    await writeFile(
      lockPath,
      JSON.stringify({
        version: 1,
        pid: process.pid,
        acquired_at: "2026-02-27T00:00:00.000Z"
      }),
      "utf8"
    );
    await setStaleMtime(lockPath);

    await expect(
      withFileLock(
        {
          lockPath,
          timeoutMs: 40,
          pollMs: 5,
          staleAfterMs: 20
        },
        async () => undefined
      )
    ).rejects.toBeInstanceOf(FileLockTimeoutError);
  });
});
