import { chmod, mkdtemp, readFile, rm, utimes, writeFile } from "node:fs/promises";
import { rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import {
  clearStaleRecoveryMisconfigurationWarnings,
  FileLockTimeoutError,
  withFileLock
} from "../../../src/core/util/fileLock.js";

const tempDirs: string[] = [];

async function createTempDir(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "pairflow-file-lock-"));
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

describe("withFileLock stale lock recovery", () => {
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
      () => {
        executed = true;
        return Promise.resolve();
      }
    );

    expect(executed).toBe(true);
    await expect(readFile(lockPath, "utf8")).rejects.toMatchObject({
      code: "ENOENT"
    });
  });

  it("does not recover lock owned by a live pid and still times out", async () => {
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
        () => Promise.resolve(undefined)
      )
    ).rejects.toBeInstanceOf(FileLockTimeoutError);
  });

  it("recovers stale lock when metadata pid is invalid", async () => {
    const root = await createTempDir();
    const lockPath = join(root, "events.ndjson.lock");

    await writeFile(
      lockPath,
      JSON.stringify({
        version: 1,
        pid: 0,
        acquired_at: "2026-02-27T00:00:00.000Z"
      }),
      "utf8"
    );
    await setStaleMtime(lockPath);

    let executed = false;
    await withFileLock(
      {
        lockPath,
        timeoutMs: 40,
        pollMs: 5,
        staleAfterMs: 20
      },
      () => {
        executed = true;
        return Promise.resolve(undefined);
      }
    );

    expect(executed).toBe(true);
  });

  it("surfaces stale lock delete permission failures immediately", async () => {
    if (process.getuid?.() === 0) {
      return;
    }

    const root = await createTempDir();
    const lockPath = join(root, "events.ndjson.lock");

    await writeFile(lockPath, "", "utf8");
    await setStaleMtime(lockPath);
    await chmod(root, 0o555);

    try {
      await expect(
        withFileLock(
          {
            lockPath,
            timeoutMs: 40,
            pollMs: 5,
            staleAfterMs: 20
          },
          () => Promise.resolve(undefined)
        )
      ).rejects.toSatisfy((error: unknown) => {
        if (error instanceof FileLockTimeoutError) {
          return false;
        }
        const typedError = error as NodeJS.ErrnoException;
        return typedError.code === "EACCES" || typedError.code === "EPERM";
      });
    } finally {
      await chmod(root, 0o755);
    }
  });

  it("falls back to timeout when stale probe cannot read lock file", async () => {
    if (process.getuid?.() === 0) {
      return;
    }

    const root = await createTempDir();
    const lockPath = join(root, "events.ndjson.lock");

    await writeFile(lockPath, "locked", "utf8");
    await setStaleMtime(lockPath);
    await chmod(lockPath, 0o000);

    try {
      await expect(
        withFileLock(
          {
            lockPath,
            timeoutMs: 40,
            pollMs: 5,
            staleAfterMs: 20
          },
          () => Promise.resolve(undefined)
        )
      ).rejects.toBeInstanceOf(FileLockTimeoutError);
    } finally {
      await chmod(lockPath, 0o644);
    }
  });

  it("warns and clamps staleAfterMs when it exceeds timeout", async () => {
    const root = await createTempDir();
    const lockPath = join(root, "events.ndjson.lock");

    await writeFile(lockPath, "", "utf8");
    await setStaleMtime(lockPath);

    const stderrSpy = vi
      .spyOn(process.stderr, "write")
      .mockImplementation(() => true);

    try {
      let executed = false;
      await withFileLock(
        {
          lockPath,
          timeoutMs: 40,
          pollMs: 5,
          staleAfterMs: 500
        },
        () => {
          executed = true;
          return Promise.resolve(undefined);
        }
      );

      expect(executed).toBe(true);
      expect(stderrSpy).toHaveBeenCalledWith(
        expect.stringContaining("staleAfterMs (500) exceeds timeoutMs (40)")
      );
    } finally {
      stderrSpy.mockRestore();
    }
  });

  it("re-checks pid liveness on second read before removing stale lock", async () => {
    const root = await createTempDir();
    const lockPath = join(root, "events.ndjson.lock");
    const trackedPid = 987_654_321;
    let trackedPidChecks = 0;

    await writeFile(
      lockPath,
      JSON.stringify({
        version: 1,
        pid: trackedPid,
        acquired_at: "2026-02-27T00:00:00.000Z"
      }),
      "utf8"
    );
    await setStaleMtime(lockPath);

    const killSpy = vi
      .spyOn(process, "kill")
      .mockImplementation(((pid: number, signal?: number | NodeJS.Signals) => {
        if (signal === 0 && pid === trackedPid) {
          trackedPidChecks += 1;
          if (trackedPidChecks === 1) {
            const missing = new Error("no such process") as NodeJS.ErrnoException;
            missing.code = "ESRCH";
            throw missing;
          }
          return true;
        }
        return true;
      }) as typeof process.kill);

    try {
      await expect(
        withFileLock(
          {
            lockPath,
            timeoutMs: 40,
            pollMs: 5,
            staleAfterMs: 20
          },
          () => Promise.resolve(undefined)
        )
      ).rejects.toBeInstanceOf(FileLockTimeoutError);
      const trackedPidCalls = killSpy.mock.calls.filter(
        ([pid, signal]) => pid === trackedPid && signal === 0
      );
      expect(trackedPidCalls.length).toBeGreaterThanOrEqual(2);
      expect(trackedPidCalls[0]).toEqual([trackedPid, 0]);
      expect(trackedPidCalls[1]).toEqual([trackedPid, 0]);
    } finally {
      killSpy.mockRestore();
    }
  });

  it("handles lock disappearance between candidate read and second-check and proceeds safely", async () => {
    const root = await createTempDir();
    const lockPath = join(root, "events.ndjson.lock");
    const trackedPid = 987_654_320;
    let trackedPidChecks = 0;

    await writeFile(
      lockPath,
      JSON.stringify({
        version: 1,
        pid: trackedPid,
        acquired_at: "2026-02-27T00:00:00.000Z"
      }),
      "utf8"
    );
    await setStaleMtime(lockPath);

    const killSpy = vi
      .spyOn(process, "kill")
      .mockImplementation(((pid: number, signal?: number | NodeJS.Signals) => {
        if (signal === 0 && pid === trackedPid) {
          trackedPidChecks += 1;
          if (trackedPidChecks === 1) {
            rmSync(lockPath, { force: true });
          }
          const missing = new Error("no such process") as NodeJS.ErrnoException;
          missing.code = "ESRCH";
          throw missing;
        }
        return true;
      }) as typeof process.kill);

    let executed = false;
    try {
      await withFileLock(
        {
          lockPath,
          timeoutMs: 40,
          pollMs: 5,
          staleAfterMs: 20
        },
        () => {
          executed = true;
          return Promise.resolve(undefined);
        }
      );
      expect(executed).toBe(true);
    } finally {
      killSpy.mockRestore();
    }
  });

  it("enforces timeout after successful stale recovery before retrying acquisition", async () => {
    const root = await createTempDir();
    const lockPath = join(root, "events.ndjson.lock");

    await writeFile(lockPath, "", "utf8");
    await setStaleMtime(lockPath);

    let executed = false;
    await expect(
      withFileLock(
        {
          lockPath,
          timeoutMs: 1,
          pollMs: 5,
          staleAfterMs: 20
        },
        () => {
          executed = true;
          return Promise.resolve(undefined);
        }
      )
    ).rejects.toBeInstanceOf(FileLockTimeoutError);

    expect(executed).toBe(false);
  });

  it("rejects staleAfterMs when it is zero", async () => {
    const root = await createTempDir();
    const lockPath = join(root, "events.ndjson.lock");

    await expect(
      withFileLock(
        {
          lockPath,
          timeoutMs: 50,
          pollMs: 5,
          staleAfterMs: 0
        },
        () => Promise.resolve(undefined)
      )
    ).rejects.toBeInstanceOf(RangeError);
  });
});
