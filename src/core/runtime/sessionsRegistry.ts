import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

import { FileLockTimeoutError, withFileLock } from "../util/fileLock.js";

export interface RuntimeSessionRecord {
  bubbleId: string;
  repoPath: string;
  worktreePath: string;
  tmuxSessionName: string;
  updatedAt: string;
}

export type RuntimeSessionsRegistry = Record<string, RuntimeSessionRecord>;

export interface ReadRuntimeSessionsOptions {
  allowMissing?: boolean;
}

export interface UpsertRuntimeSessionInput {
  sessionsPath: string;
  bubbleId: string;
  repoPath: string;
  worktreePath: string;
  tmuxSessionName: string;
  now?: Date;
  lockTimeoutMs?: number;
}

export interface RemoveRuntimeSessionInput {
  sessionsPath: string;
  bubbleId: string;
  lockTimeoutMs?: number;
}

export interface RemoveRuntimeSessionsInput {
  sessionsPath: string;
  bubbleIds: string[];
  lockTimeoutMs?: number;
}

export interface RemoveRuntimeSessionsResult {
  removedBubbleIds: string[];
  missingBubbleIds: string[];
}

export class RuntimeSessionsRegistryError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "RuntimeSessionsRegistryError";
  }
}

export class RuntimeSessionsRegistryLockError extends RuntimeSessionsRegistryError {
  public constructor(message: string) {
    super(message);
    this.name = "RuntimeSessionsRegistryLockError";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requireNonEmptyString(value: unknown, fieldName: string): string {
  if (typeof value !== "string") {
    throw new RuntimeSessionsRegistryError(`${fieldName} must be a string.`);
  }
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    throw new RuntimeSessionsRegistryError(`${fieldName} cannot be empty.`);
  }
  return trimmed;
}

function parseSessionRecord(
  bubbleIdFromKey: string,
  value: unknown
): RuntimeSessionRecord {
  if (!isRecord(value)) {
    throw new RuntimeSessionsRegistryError(
      `Invalid runtime session record for bubble ${bubbleIdFromKey}.`
    );
  }

  const bubbleId = requireNonEmptyString(value.bubbleId, "runtime session bubbleId");
  const repoPath = requireNonEmptyString(value.repoPath, "runtime session repoPath");
  const worktreePath = requireNonEmptyString(
    value.worktreePath,
    "runtime session worktreePath"
  );
  const tmuxSessionName = requireNonEmptyString(
    value.tmuxSessionName,
    "runtime session tmuxSessionName"
  );
  const updatedAt = requireNonEmptyString(value.updatedAt, "runtime session updatedAt");

  if (bubbleId !== bubbleIdFromKey) {
    throw new RuntimeSessionsRegistryError(
      `Runtime session key mismatch: expected ${bubbleIdFromKey}, found ${bubbleId}.`
    );
  }

  return {
    bubbleId,
    repoPath,
    worktreePath,
    tmuxSessionName,
    updatedAt
  };
}

function parseRegistry(raw: string): RuntimeSessionsRegistry {
  if (raw.trim().length === 0) {
    return {};
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new RuntimeSessionsRegistryError(
      `Invalid runtime sessions JSON: ${message}`
    );
  }

  if (!isRecord(parsed)) {
    throw new RuntimeSessionsRegistryError(
      "Runtime sessions registry must be a JSON object."
    );
  }

  const registry: RuntimeSessionsRegistry = {};
  for (const [key, value] of Object.entries(parsed)) {
    registry[key] = parseSessionRecord(key, value);
  }
  return registry;
}

function serializeRegistry(registry: RuntimeSessionsRegistry): string {
  const orderedEntries = Object.entries(registry).sort(([a], [b]) =>
    a.localeCompare(b)
  );
  return `${JSON.stringify(Object.fromEntries(orderedEntries), null, 2)}\n`;
}

async function atomicWriteRegistry(
  sessionsPath: string,
  registry: RuntimeSessionsRegistry
): Promise<void> {
  const parent = dirname(sessionsPath);
  await mkdir(parent, { recursive: true });

  const tempPath = join(parent, `.sessions-${randomUUID()}.tmp`);
  try {
    await writeFile(tempPath, serializeRegistry(registry), {
      encoding: "utf8"
    });
    await rename(tempPath, sessionsPath);
  } catch (error) {
    await rm(tempPath, { force: true }).catch(() => undefined);
    throw error;
  }
}

async function withSessionsLock<T>(
  sessionsPath: string,
  timeoutMs: number,
  task: () => Promise<T>
): Promise<T> {
  const lockPath = `${sessionsPath}.lock`;
  try {
    return await withFileLock(
      {
        lockPath,
        timeoutMs,
        ensureParentDir: true
      },
      task
    );
  } catch (error) {
    if (error instanceof FileLockTimeoutError) {
      throw new RuntimeSessionsRegistryLockError(
        `Could not acquire runtime sessions lock: ${lockPath}`
      );
    }
    throw error;
  }
}

export async function readRuntimeSessionsRegistry(
  sessionsPath: string,
  options: ReadRuntimeSessionsOptions = {}
): Promise<RuntimeSessionsRegistry> {
  let raw: string;
  try {
    raw = await readFile(sessionsPath, "utf8");
  } catch (error) {
    const typedError = error as NodeJS.ErrnoException;
    if ((options.allowMissing ?? true) && typedError.code === "ENOENT") {
      return {};
    }
    throw error;
  }

  return parseRegistry(raw);
}

export async function upsertRuntimeSession(
  input: UpsertRuntimeSessionInput
): Promise<RuntimeSessionRecord> {
  return withSessionsLock(
    input.sessionsPath,
    input.lockTimeoutMs ?? 5_000,
    async () => {
      const registry = await readRuntimeSessionsRegistry(input.sessionsPath, {
        allowMissing: true
      });
      const updatedAt = (input.now ?? new Date()).toISOString();
      const nextRecord: RuntimeSessionRecord = {
        bubbleId: requireNonEmptyString(input.bubbleId, "bubbleId"),
        repoPath: requireNonEmptyString(input.repoPath, "repoPath"),
        worktreePath: requireNonEmptyString(input.worktreePath, "worktreePath"),
        tmuxSessionName: requireNonEmptyString(input.tmuxSessionName, "tmuxSessionName"),
        updatedAt
      };

      registry[nextRecord.bubbleId] = nextRecord;
      await atomicWriteRegistry(input.sessionsPath, registry);
      return nextRecord;
    }
  );
}

export async function removeRuntimeSession(
  input: RemoveRuntimeSessionInput
): Promise<boolean> {
  const result = await removeRuntimeSessions({
    sessionsPath: input.sessionsPath,
    bubbleIds: [input.bubbleId],
    ...(input.lockTimeoutMs !== undefined
      ? { lockTimeoutMs: input.lockTimeoutMs }
      : {})
  });
  return result.removedBubbleIds.length > 0;
}

export async function removeRuntimeSessions(
  input: RemoveRuntimeSessionsInput
): Promise<RemoveRuntimeSessionsResult> {
  const normalizedBubbleIds = Array.from(
    new Set(
      input.bubbleIds.map((bubbleId) =>
        requireNonEmptyString(bubbleId, "bubbleId")
      )
    )
  );

  return withSessionsLock(
    input.sessionsPath,
    input.lockTimeoutMs ?? 5_000,
    async () => {
      const registry = await readRuntimeSessionsRegistry(input.sessionsPath, {
        allowMissing: true
      });

      const removedBubbleIds: string[] = [];
      const missingBubbleIds: string[] = [];

      for (const bubbleId of normalizedBubbleIds) {
        if (Object.hasOwn(registry, bubbleId)) {
          delete registry[bubbleId];
          removedBubbleIds.push(bubbleId);
        } else {
          missingBubbleIds.push(bubbleId);
        }
      }

      if (removedBubbleIds.length > 0) {
        await atomicWriteRegistry(input.sessionsPath, registry);
      }

      return {
        removedBubbleIds,
        missingBubbleIds
      };
    }
  );
}
