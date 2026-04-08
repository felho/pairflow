import { readFile, rm, stat } from "node:fs/promises";
import {
  hasErrnoCode,
  isRecoverableProbeErrno,
  toFileLockTimeoutError
} from "./fileLockErrors.js";

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

export function getLockFileMetadata(): LockFileMetadata {
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

export async function handleExistingLock(input: {
  lockPath: string;
  startedAt: number;
  staleAfterMs?: number;
  timeoutMs: number;
}): Promise<"retry" | "wait"> {
  if (Date.now() - input.startedAt >= input.timeoutMs) {
    throw toFileLockTimeoutError({
      lockPath: input.lockPath,
      timeoutMs: input.timeoutMs,
      reason: "initial_lock_timeout",
      ...(input.staleAfterMs !== undefined
        ? { staleAfterMs: input.staleAfterMs }
        : {})
    });
  }

  if (input.staleAfterMs !== undefined) {
    const recovered = await tryRecoverStaleLock(
      input.lockPath,
      input.staleAfterMs
    );
    if (recovered) {
      if (Date.now() - input.startedAt >= input.timeoutMs) {
        throw toFileLockTimeoutError({
          lockPath: input.lockPath,
          timeoutMs: input.timeoutMs,
          reason: "post_recovery_lock_timeout",
          ...(input.staleAfterMs !== undefined
            ? { staleAfterMs: input.staleAfterMs }
            : {})
        });
      }
      return "retry";
    }
  }

  return "wait";
}
