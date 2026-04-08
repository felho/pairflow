import { mkdir, open, rm } from "node:fs/promises";
import { dirname } from "node:path";
import {
  hasErrnoCode,
  toFileLockRangeError,
  toFileLockTimeoutError,
  warnStaleRecoveryMisconfiguration
} from "./fileLockErrors.js";
import {
  getLockFileMetadata,
  handleExistingLock
} from "./fileLockStaleRecovery.js";

export {
  clearStaleRecoveryMisconfigurationWarnings,
  FileLockTimeoutError
} from "./fileLockErrors.js";

export interface WithFileLockOptions {
  lockPath: string;
  timeoutMs: number;
  pollMs?: number;
  ensureParentDir?: boolean;
  staleAfterMs?: number;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export async function withFileLock<T>(
  options: WithFileLockOptions,
  task: () => Promise<T>
): Promise<T> {
  if (options.ensureParentDir) {
    await mkdir(dirname(options.lockPath), { recursive: true });
  }

  const startedAt = Date.now();
  const pollMs = options.pollMs ?? 25;
  let staleAfterMs = options.staleAfterMs;
  if (staleAfterMs !== undefined && staleAfterMs <= 0) {
    throw toFileLockRangeError({
      message: `staleAfterMs must be > 0 when provided: ${options.lockPath}`,
      context: {
        lockPath: options.lockPath,
        reason: "invalid_stale_after_ms",
        staleAfterMs,
        timeoutMs: options.timeoutMs
      }
    });
  }

  if (staleAfterMs !== undefined && staleAfterMs > options.timeoutMs) {
    warnStaleRecoveryMisconfiguration(
      options.lockPath,
      staleAfterMs,
      options.timeoutMs
    );
    staleAfterMs = options.timeoutMs;
    if (staleAfterMs <= 0) {
      staleAfterMs = undefined;
    }
  }

  while (true) {
    let lockHandle;
    try {
      lockHandle = await open(options.lockPath, "wx");
    } catch (error) {
      if (!hasErrnoCode(error) || error.code !== "EEXIST") {
        throw error;
      }
      const nextAction = await handleExistingLock({
        lockPath: options.lockPath,
        startedAt,
        ...(staleAfterMs !== undefined ? { staleAfterMs } : {}),
        timeoutMs: options.timeoutMs
      });
      if (nextAction === "retry") {
        continue;
      }
      await delay(pollMs);
      continue;
    }

    if (Date.now() - startedAt >= options.timeoutMs) {
      await lockHandle.close().catch(() => undefined);
      await rm(options.lockPath, { force: true }).catch(() => undefined);
      throw toFileLockTimeoutError({
        lockPath: options.lockPath,
        timeoutMs: options.timeoutMs,
        reason: "lock_timed_out_after_open",
        ...(staleAfterMs !== undefined ? { staleAfterMs } : {})
      });
    }

    try {
      await lockHandle.writeFile(JSON.stringify(getLockFileMetadata()), "utf8");
    } catch (error) {
      await lockHandle.close().catch(() => undefined);
      await rm(options.lockPath, { force: true }).catch(() => undefined);
      throw error;
    }

    try {
      return await task();
    } finally {
      await lockHandle.close().catch(() => undefined);
      await rm(options.lockPath, { force: true }).catch(() => undefined);
    }
  }
}
