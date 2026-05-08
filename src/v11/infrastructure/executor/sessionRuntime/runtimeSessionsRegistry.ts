import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

import {
  FileLockTimeoutError,
  withFileLock
} from "../../foundation/fs/fileLock.js";
import {
  buildSessionRecord,
  parseRuntimeSessionsRegistry,
  serializeRuntimeSessionsRegistry
} from "./runtimeSessionsRegistryDocument.js";
import {
  toRuntimeSessionsRegistryError,
  toRuntimeSessionsRegistryLockError
} from "./runtimeSessionsRegistryErrors.js";
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
  RuntimeSessionRecord,
  RuntimeSessionsRegistry
} from "../../../ports/runtimeSessions.js";
import type { WorkspaceKind } from "../../../ports/worktreeWorkspace.js";

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
  RuntimeSessionRecord,
  RuntimeSessionsRegistry
} from "../../../ports/runtimeSessions.js";
export type { RuntimeMetaReviewerPaneBinding } from "../../../ports/runtimeSessions.js";
export {
  RuntimeSessionsRegistryError,
  RuntimeSessionsRegistryLockError
} from "./runtimeSessionsRegistryErrors.js";

export interface UpsertRuntimeSessionInput {
  sessionsPath: string;
  bubbleId: string;
  repoPath: string;
  worktreePath: string;
  workspacePath?: string;
  workspaceKind?: WorkspaceKind;
  tmuxSessionName: string;
  now?: Date;
  lockTimeoutMs?: number;
}

function normalizeBubbleId(value: string): string {
  const bubbleId = value.trim();
  if (bubbleId.length === 0) {
    throw toRuntimeSessionsRegistryError({
      message: "bubbleId cannot be empty.",
      context: {
        fieldName: "bubbleId",
        reason: "field_empty"
      }
    });
  }
  return bubbleId;
}

export async function writeRuntimeSessionsRegistry(
  sessionsPath: string,
  registry: RuntimeSessionsRegistry
): Promise<void> {
  const parent = dirname(sessionsPath);
  await mkdir(parent, { recursive: true });

  const tempPath = join(parent, `.sessions-${randomUUID()}.tmp`);
  try {
    await writeFile(tempPath, serializeRuntimeSessionsRegistry(registry), {
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

  return parseRuntimeSessionsRegistry(raw);
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

      const bubbleId = normalizeBubbleId(input.bubbleId);
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
    new Set(input.bubbleIds.map((bubbleId) => normalizeBubbleId(bubbleId)))
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
