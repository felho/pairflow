import type { readFile } from "node:fs/promises";

const findingsArtifactReadRetryableErrorCodes = new Set([
  "ENOENT",
  "ESTALE",
  "EAGAIN",
  "EBUSY",
  "ETIMEDOUT"
]);
const findingsArtifactReadMaxAttempts = 3;
const findingsArtifactReadRetryBaseDelayMs = 25;
const findingsArtifactReadRetryMaxDelayMs = 75;

function resolveFindingsArtifactReadRetryDelayMs(attempt: number): number {
  const exponent = Math.max(0, attempt - 1);
  return Math.min(
    findingsArtifactReadRetryMaxDelayMs,
    findingsArtifactReadRetryBaseDelayMs * (2 ** exponent)
  );
}

async function defaultSleepForRetryMs(delayMs: number): Promise<void> {
  await new Promise<void>((resolveDelay) => {
    setTimeout(resolveDelay, delayMs);
  });
}

function isRetryableFindingsArtifactReadError(error: unknown): boolean {
  if (!(error instanceof Error) || !("code" in error)) {
    return false;
  }
  const code = (error as NodeJS.ErrnoException).code;
  return (
    typeof code === "string" &&
    findingsArtifactReadRetryableErrorCodes.has(code.trim().toUpperCase())
  );
}

export function formatReadErrorDetail(error: unknown): string {
  if (error instanceof Error && "code" in error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (typeof code === "string" && code.trim().length > 0) {
      return `${code.trim().toUpperCase()}: ${error.message}`;
    }
  }
  return error instanceof Error ? error.message : String(error);
}

export async function readFindingsArtifactWithRetry(input: {
  artifactPath: string;
  readFileFn: typeof readFile;
  sleepForRetryMs?: (delayMs: number) => Promise<void>;
}): Promise<
  | { ok: true; raw: string; attempts: number }
  | { ok: false; error: unknown; attempts: number; retried: boolean }
> {
  let attempts = 0;
  let lastError: unknown = new Error("unknown findings artifact read error");

  while (attempts < findingsArtifactReadMaxAttempts) {
    attempts += 1;
    try {
      const raw = await input.readFileFn(input.artifactPath, "utf8");
      return { ok: true, raw, attempts };
    } catch (error) {
      lastError = error;
      if (
        !isRetryableFindingsArtifactReadError(error) ||
        attempts >= findingsArtifactReadMaxAttempts
      ) {
        return {
          ok: false,
          error,
          attempts,
          retried: attempts > 1
        };
      }
      const retryDelayMs = resolveFindingsArtifactReadRetryDelayMs(attempts);
      const sleepForRetryMs = input.sleepForRetryMs ?? defaultSleepForRetryMs;
      await sleepForRetryMs(retryDelayMs);
    }
  }

  return {
    ok: false,
    error: lastError,
    attempts,
    retried: attempts > 1
  };
}
