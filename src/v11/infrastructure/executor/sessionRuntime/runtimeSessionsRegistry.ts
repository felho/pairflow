import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

import {
  FileLockTimeoutError,
  withFileLock
} from "../../foundation/fs/fileLock.js";
import type {
  ClaimRuntimeSessionInput,
  ClaimRuntimeSessionPort,
  ClaimRuntimeSessionResult,
  ReadRuntimeSessionsOptions,
  ReadRuntimeSessionsRegistryPort,
  RemoveRuntimeSessionInput,
  RemoveRuntimeSessionPort,
  RemoveRuntimeSessionsInput,
  RemoveRuntimeSessionsPort,
  RemoveRuntimeSessionsResult,
  RuntimeMetaReviewerPaneBinding,
  RuntimeSessionRecord,
  RuntimeSessionsRegistry
} from "../../../shared/ports/runtimeSessions.js";

export type {
  ClaimRuntimeSessionInput,
  ClaimRuntimeSessionPort,
  ClaimRuntimeSessionResult,
  ReadRuntimeSessionsOptions,
  ReadRuntimeSessionsRegistryPort,
  RemoveRuntimeSessionInput,
  RemoveRuntimeSessionPort,
  RemoveRuntimeSessionsInput,
  RemoveRuntimeSessionsPort,
  RemoveRuntimeSessionsResult,
  RuntimeMetaReviewerPaneBinding,
  RuntimeSessionRecord,
  RuntimeSessionsRegistry
} from "../../../shared/ports/runtimeSessions.js";

export interface UpsertRuntimeSessionInput {
  sessionsPath: string;
  bubbleId: string;
  repoPath: string;
  worktreePath: string;
  tmuxSessionName: string;
  now?: Date;
  lockTimeoutMs?: number;
}

interface RuntimeSessionsRegistryErrorContext {
  bubbleId?: string | undefined;
  fieldName?: string | undefined;
  lockPath?: string | undefined;
  reason?: string | undefined;
  sessionsPath?: string | undefined;
}

interface RuntimeSessionsRegistryErrorOptions extends ErrorOptions {
  context?: RuntimeSessionsRegistryErrorContext | undefined;
}

export class RuntimeSessionsRegistryError extends Error {
  public readonly context: RuntimeSessionsRegistryErrorContext | undefined;

  public constructor(
    message: string,
    options?: RuntimeSessionsRegistryErrorOptions
  ) {
    super(message, options);
    this.name = "RuntimeSessionsRegistryError";
    this.context = options?.context;
  }
}

export class RuntimeSessionsRegistryLockError extends RuntimeSessionsRegistryError {
  public constructor(
    message: string,
    options?: RuntimeSessionsRegistryErrorOptions
  ) {
    super(message, options);
    this.name = "RuntimeSessionsRegistryLockError";
  }
}

function toRuntimeSessionsRegistryError(input: {
  message: string;
  context: RuntimeSessionsRegistryErrorContext;
  cause?: unknown;
}): RuntimeSessionsRegistryError {
  return new RuntimeSessionsRegistryError(input.message, {
    context: input.context,
    ...(input.cause !== undefined ? { cause: input.cause } : {})
  });
}

function toRuntimeSessionsRegistryLockError(input: {
  message: string;
  context: RuntimeSessionsRegistryErrorContext;
  cause?: unknown;
}): RuntimeSessionsRegistryLockError {
  return new RuntimeSessionsRegistryLockError(input.message, {
    context: input.context,
    ...(input.cause !== undefined ? { cause: input.cause } : {})
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requireNonEmptyString(value: unknown, fieldName: string): string {
  if (typeof value !== "string") {
    throw toRuntimeSessionsRegistryError({
      message: `${fieldName} must be a string.`,
      context: {
        fieldName,
        reason: "field_not_string"
      }
    });
  }
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    throw toRuntimeSessionsRegistryError({
      message: `${fieldName} cannot be empty.`,
      context: {
        fieldName,
        reason: "field_empty"
      }
    });
  }
  return trimmed;
}

function parseMetaReviewerPaneBinding(
  value: unknown,
  bubbleId: string
): RuntimeMetaReviewerPaneBinding | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (!isRecord(value)) {
    throw toRuntimeSessionsRegistryError({
      message: `Invalid runtime meta-reviewer pane binding for bubble ${bubbleId}.`,
      context: {
        bubbleId,
        fieldName: "metaReviewerPane",
        reason: "binding_not_object"
      }
    });
  }
  const role = requireNonEmptyString(
    value.role,
    "runtime session metaReviewerPane.role"
  );
  if (role !== "meta-reviewer") {
    throw toRuntimeSessionsRegistryError({
      message: `runtime session metaReviewerPane.role must be "meta-reviewer" (found ${role}).`,
      context: {
        bubbleId,
        fieldName: "metaReviewerPane.role",
        reason: "invalid_role"
      }
    });
  }
  const paneIndexValue = value.paneIndex;
  if (
    typeof paneIndexValue !== "number" ||
    !Number.isInteger(paneIndexValue) ||
    paneIndexValue < 0
  ) {
    throw toRuntimeSessionsRegistryError({
      message: "runtime session metaReviewerPane.paneIndex must be a non-negative integer.",
      context: {
        bubbleId,
        fieldName: "metaReviewerPane.paneIndex",
        reason: "invalid_pane_index"
      }
    });
  }
  const activeValue = value.active;
  if (typeof activeValue !== "boolean") {
    throw toRuntimeSessionsRegistryError({
      message: "runtime session metaReviewerPane.active must be a boolean.",
      context: {
        bubbleId,
        fieldName: "metaReviewerPane.active",
        reason: "invalid_active_type"
      }
    });
  }
  const updatedAt = requireNonEmptyString(
    value.updatedAt,
    "runtime session metaReviewerPane.updatedAt"
  );
  return {
    role: "meta-reviewer",
    paneIndex: paneIndexValue,
    active: activeValue,
    updatedAt
  };
}

function parseSessionRecord(
  bubbleIdFromKey: string,
  value: unknown
): RuntimeSessionRecord {
  if (!isRecord(value)) {
    throw toRuntimeSessionsRegistryError({
      message: `Invalid runtime session record for bubble ${bubbleIdFromKey}.`,
      context: {
        bubbleId: bubbleIdFromKey,
        reason: "record_not_object"
      }
    });
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
  const metaReviewerPane = parseMetaReviewerPaneBinding(
    value.metaReviewerPane,
    bubbleIdFromKey
  );

  if (bubbleId !== bubbleIdFromKey) {
    throw toRuntimeSessionsRegistryError({
      message: `Runtime session key mismatch: expected ${bubbleIdFromKey}, found ${bubbleId}.`,
      context: {
        bubbleId: bubbleIdFromKey,
        fieldName: "bubbleId",
        reason: "key_mismatch"
      }
    });
  }

  return {
    bubbleId,
    repoPath,
    worktreePath,
    tmuxSessionName,
    updatedAt,
    ...(metaReviewerPane !== undefined ? { metaReviewerPane } : {})
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
    throw toRuntimeSessionsRegistryError({
      message: `Invalid runtime sessions JSON: ${message}`,
      context: {
        reason: "invalid_json"
      },
      cause: error
    });
  }

  if (!isRecord(parsed)) {
    throw toRuntimeSessionsRegistryError({
      message: "Runtime sessions registry must be a JSON object.",
      context: {
        reason: "not_a_json_object"
      }
    });
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

function buildSessionRecord(input: {
  bubbleId: string;
  repoPath: string;
  worktreePath: string;
  tmuxSessionName: string;
  metaReviewerPane?: RuntimeMetaReviewerPaneBinding;
  now?: Date | undefined;
}): RuntimeSessionRecord {
  return {
    bubbleId: requireNonEmptyString(input.bubbleId, "bubbleId"),
    repoPath: requireNonEmptyString(input.repoPath, "repoPath"),
    worktreePath: requireNonEmptyString(input.worktreePath, "worktreePath"),
    tmuxSessionName: requireNonEmptyString(input.tmuxSessionName, "tmuxSessionName"),
    updatedAt: (input.now ?? new Date()).toISOString(),
    ...(input.metaReviewerPane !== undefined
      ? { metaReviewerPane: input.metaReviewerPane }
      : {})
  };
}

export async function writeRuntimeSessionsRegistry(
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

export async function withRuntimeSessionsRegistryLock<T>(
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
      throw toRuntimeSessionsRegistryLockError({
        message: `Could not acquire runtime sessions lock: ${lockPath}`,
        context: {
          lockPath,
          sessionsPath,
          reason: "lock_timeout"
        },
        cause: error
      });
    }
    throw error;
  }
}

export const readRuntimeSessionsRegistry: ReadRuntimeSessionsRegistryPort = async (
  sessionsPath: string,
  options: ReadRuntimeSessionsOptions = {}
): Promise<RuntimeSessionsRegistry> => {
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
};

export async function upsertRuntimeSession(
  input: UpsertRuntimeSessionInput
): Promise<RuntimeSessionRecord> {
  return withRuntimeSessionsRegistryLock(
    input.sessionsPath,
    input.lockTimeoutMs ?? 5_000,
    async () => {
      const registry = await readRuntimeSessionsRegistry(input.sessionsPath, {
        allowMissing: true
      });
      const nextRecord = buildSessionRecord(input);

      registry[nextRecord.bubbleId] = nextRecord;
      await writeRuntimeSessionsRegistry(input.sessionsPath, registry);
      return nextRecord;
    }
  );
}

export const claimRuntimeSession: ClaimRuntimeSessionPort = async (
  input: ClaimRuntimeSessionInput
): Promise<ClaimRuntimeSessionResult> => {
  return withRuntimeSessionsRegistryLock(
    input.sessionsPath,
    input.lockTimeoutMs ?? 5_000,
    async () => {
      const registry = await readRuntimeSessionsRegistry(input.sessionsPath, {
        allowMissing: true
      });

      const bubbleId = requireNonEmptyString(input.bubbleId, "bubbleId");
      const existing = registry[bubbleId];
      if (existing !== undefined) {
        return {
          claimed: false,
          record: existing
        };
      }

      const nextRecord = buildSessionRecord(input);
      registry[nextRecord.bubbleId] = nextRecord;
      await writeRuntimeSessionsRegistry(input.sessionsPath, registry);
      return {
        claimed: true,
        record: nextRecord
      };
    }
  );
};

export const removeRuntimeSession: RemoveRuntimeSessionPort = async (
  input: RemoveRuntimeSessionInput
): Promise<boolean> => {
  const result = await removeRuntimeSessions({
    sessionsPath: input.sessionsPath,
    bubbleIds: [input.bubbleId],
    ...(input.lockTimeoutMs !== undefined
      ? { lockTimeoutMs: input.lockTimeoutMs }
      : {})
  });
  return result.removedBubbleIds.length > 0;
};

export const removeRuntimeSessions: RemoveRuntimeSessionsPort = async (
  input: RemoveRuntimeSessionsInput
): Promise<RemoveRuntimeSessionsResult> => {
  const normalizedBubbleIds = Array.from(
    new Set(
      input.bubbleIds.map((bubbleId) =>
        requireNonEmptyString(bubbleId, "bubbleId")
      )
    )
  );

  return withRuntimeSessionsRegistryLock(
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
        await writeRuntimeSessionsRegistry(input.sessionsPath, registry);
      }

      return {
        removedBubbleIds,
        missingBubbleIds
      };
    }
  );
};
