export interface FileLockErrorContext {
  lockPath: string;
  reason?: string;
  staleAfterMs?: number | undefined;
  timeoutMs?: number | undefined;
}

export class FileLockTimeoutError extends Error {
  public readonly lockPath: string;
  public readonly timeoutMs: number;
  public readonly context: FileLockErrorContext | undefined;

  public constructor(
    lockPath: string,
    timeoutMs: number,
    context?: FileLockErrorContext
  ) {
    super(`Could not acquire file lock within timeout: ${lockPath}`);
    this.name = "FileLockTimeoutError";
    this.lockPath = lockPath;
    this.timeoutMs = timeoutMs;
    this.context = context;
  }
}

const staleRecoveryMisconfigurationWarnings = new Set<string>();

export function clearStaleRecoveryMisconfigurationWarnings(): void {
  staleRecoveryMisconfigurationWarnings.clear();
}

export function toFileLockTimeoutError(input: {
  lockPath: string;
  timeoutMs: number;
  reason: string;
  staleAfterMs?: number | undefined;
}): FileLockTimeoutError {
  return new FileLockTimeoutError(input.lockPath, input.timeoutMs, {
    lockPath: input.lockPath,
    reason: input.reason,
    ...(input.staleAfterMs !== undefined ? { staleAfterMs: input.staleAfterMs } : {}),
    timeoutMs: input.timeoutMs
  });
}

export function toFileLockRangeError(input: {
  message: string;
  context: FileLockErrorContext;
}): RangeError & { context: FileLockErrorContext } {
  return Object.assign(new RangeError(input.message), {
    context: input.context
  });
}

export function hasErrnoCode(error: unknown): error is NodeJS.ErrnoException {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof (error as { code?: unknown }).code === "string"
  );
}

export function isRecoverableProbeErrno(error: unknown): boolean {
  if (!hasErrnoCode(error)) {
    return false;
  }

  return (
    error.code === "ENOENT" ||
    error.code === "EACCES" ||
    error.code === "EPERM"
  );
}

export function warnStaleRecoveryMisconfiguration(
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
