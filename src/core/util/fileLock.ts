import { mkdir, open, rm } from "node:fs/promises";
import { dirname } from "node:path";

export interface WithFileLockOptions {
  lockPath: string;
  timeoutMs: number;
  pollMs?: number;
  ensureParentDir?: boolean;
}

export class FileLockTimeoutError extends Error {
  public readonly lockPath: string;
  public readonly timeoutMs: number;

  public constructor(lockPath: string, timeoutMs: number) {
    super(`Could not acquire file lock within timeout: ${lockPath}`);
    this.name = "FileLockTimeoutError";
    this.lockPath = lockPath;
    this.timeoutMs = timeoutMs;
  }
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

  while (true) {
    let lockHandle;
    try {
      lockHandle = await open(options.lockPath, "wx");
    } catch (error) {
      const typedError = error as NodeJS.ErrnoException;
      if (typedError.code !== "EEXIST") {
        throw error;
      }

      if (Date.now() - startedAt >= options.timeoutMs) {
        throw new FileLockTimeoutError(options.lockPath, options.timeoutMs);
      }

      await delay(pollMs);
      continue;
    }

    try {
      return await task();
    } finally {
      await lockHandle.close().catch(() => undefined);
      await rm(options.lockPath, { force: true }).catch(() => undefined);
    }
  }
}
