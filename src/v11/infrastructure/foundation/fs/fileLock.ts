import { mkdir, open, readFile, rm, stat } from "node:fs/promises";
import { dirname } from "node:path";

export interface WithFileLockOptions {
  lockPath: string;
  timeoutMs: number;
  pollMs?: number;
  ensureParentDir?: boolean;
  staleAfterMs?: number;
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

interface LockFileMetadata {
  version: 1;
  pid: number;
  acquired_at: string;
}

interface LockOwnerPidParseResult {
  ownerPid: number | null;
}

interface StaleLockCandidate {
  mtimeMs: number;
  size: number;
  content: string;
}

const staleRecoveryMisconfigurationWarnings = new Set<string>();

export function clearStaleRecoveryMisconfigurationWarnings(): void {
  staleRecoveryMisconfigurationWarnings.clear();
}

function hasErrnoCode(error: unknown): error is NodeJS.ErrnoException {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof (error as { code?: unknown }).code === "string"
  );
}

function isRecoverableProbeErrno(error: unknown): boolean {
  if (!hasErrnoCode(error)) {
    return false;
  }

  return (
    error.code === "ENOENT" ||
    error.code === "EACCES" ||
    error.code === "EPERM"
  );
}

function warnStaleRecoveryMisconfiguration(
  lockPath: string,
  staleAfterMs: number,
  timeoutMs: number
): void {
  const warningKey = `${lockPath}:${staleAfterMs}:${timeoutMs}`;
  if (staleRecoveryMisconfigurationWarnings.has(warningKey)) {
    return;
  }

  staleRecoveryMisconfigurationWarnings.add(warningKey);
  process.stderr.write(
    `Pairflow warning: staleAfterMs (${staleAfterMs}) exceeds timeoutMs (${timeoutMs}) for lock ${lockPath}; clamping staleAfterMs to timeoutMs.\n`
  );
}

function getLockFileMetadata(): LockFileMetadata {
  return {
    version: 1,
    pid: process.pid,
    acquired_at: new Date().toISOString()
  };
}

function parseLockOwnerPid(content: string): LockOwnerPidParseResult {
  try {
    const parsed = JSON.parse(content) as { pid?: unknown } | null;
    if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {
        ownerPid: null
      };
    }
    if (!Object.hasOwn(parsed, "pid")) {
      return {
        ownerPid: null
      };
    }
    if (
      typeof parsed.pid === "number" &&
      Number.isInteger(parsed.pid) &&
      parsed.pid > 0
    ) {
      return {
        ownerPid: parsed.pid
      };
    }
    return {
      ownerPid: null
    };
  } catch {
    return {
      ownerPid: null
    };
  }
}

function isProcessAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    if (hasErrnoCode(error) && error.code === "ESRCH") {
      return false;
    }
    return true;
  }
}

async function getStaleLockCandidate(
  lockPath: string,
  staleAfterMs: number
): Promise<StaleLockCandidate | null> {
  let lockStats;
  try {
    lockStats = await stat(lockPath);
  } catch (error) {
    if (hasErrnoCode(error) && error.code === "ENOENT") {
      return null;
    }
    throw error;
  }

  if (Date.now() - lockStats.mtimeMs < staleAfterMs) {
    return null;
  }

  let content: string;
  try {
    content = await readFile(lockPath, "utf8");
  } catch (error) {
    if (hasErrnoCode(error) && error.code === "ENOENT") {
      return null;
    }
    throw error;
  }

  const parsedLockOwner = parseLockOwnerPid(content);
  if (parsedLockOwner.ownerPid !== null) {
    if (isProcessAlive(parsedLockOwner.ownerPid)) {
      return null;
    }
  }

  return {
    mtimeMs: lockStats.mtimeMs,
    size: lockStats.size,
    content
  };
}

async function hasSameStaleLockCandidate(
  lockPath: string,
  candidate: StaleLockCandidate,
  staleAfterMs: number
): Promise<boolean> {
  let currentStats;
  try {
    currentStats = await stat(lockPath);
  } catch (error) {
    if (hasErrnoCode(error) && error.code === "ENOENT") {
      return false;
    }
    throw error;
  }

  if (
    Date.now() - currentStats.mtimeMs < staleAfterMs ||
    currentStats.mtimeMs !== candidate.mtimeMs ||
    currentStats.size !== candidate.size
  ) {
    return false;
  }

  let currentContent: string;
  try {
    currentContent = await readFile(lockPath, "utf8");
  } catch (error) {
    if (hasErrnoCode(error) && error.code === "ENOENT") {
      return false;
    }
    throw error;
  }

  if (currentContent !== candidate.content) {
    return false;
  }

  const parsedCurrentLockOwner = parseLockOwnerPid(currentContent);
  if (parsedCurrentLockOwner.ownerPid !== null) {
    if (isProcessAlive(parsedCurrentLockOwner.ownerPid)) {
      return false;
    }
  }
  return true;
}

async function tryRecoverStaleLock(
  lockPath: string,
  staleAfterMs: number
): Promise<boolean> {
  let candidate: StaleLockCandidate | null;
  try {
    candidate = await getStaleLockCandidate(lockPath, staleAfterMs);
  } catch (error) {
    if (isRecoverableProbeErrno(error)) {
      return false;
    }
    throw error;
  }

  if (candidate === null) {
    return false;
  }

  try {
    if (!(await hasSameStaleLockCandidate(lockPath, candidate, staleAfterMs))) {
      return false;
    }
  } catch (error) {
    if (isRecoverableProbeErrno(error)) {
      return false;
    }
    throw error;
  }

  try {
    await rm(lockPath);
    return true;
  } catch (error) {
    if (hasErrnoCode(error) && error.code === "ENOENT") {
      return false;
    }
    throw error;
  }
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
    throw new RangeError(
      `staleAfterMs must be > 0 when provided: ${options.lockPath}`
    );
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

      if (Date.now() - startedAt >= options.timeoutMs) {
        throw new FileLockTimeoutError(options.lockPath, options.timeoutMs);
      }

      if (staleAfterMs !== undefined) {
        const recovered = await tryRecoverStaleLock(
          options.lockPath,
          staleAfterMs
        );
        if (recovered) {
          if (Date.now() - startedAt >= options.timeoutMs) {
            throw new FileLockTimeoutError(options.lockPath, options.timeoutMs);
          }
          continue;
        }
      }

      await delay(pollMs);
      continue;
    }

    if (Date.now() - startedAt >= options.timeoutMs) {
      await lockHandle.close().catch(() => undefined);
      await rm(options.lockPath, { force: true }).catch(() => undefined);
      throw new FileLockTimeoutError(options.lockPath, options.timeoutMs);
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
