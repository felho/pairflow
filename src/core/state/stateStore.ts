import { createHash } from "node:crypto";
import { dirname, join } from "node:path";
import { randomUUID } from "node:crypto";
import { readFile, rename, rm, writeFile } from "node:fs/promises";

import { assertValidBubbleStateSnapshot } from "./stateSchema.js";
import { FileLockTimeoutError, withFileLock } from "../util/fileLock.js";
import type { BubbleLifecycleState, BubbleStateSnapshot } from "../../types/bubble.js";

export interface LoadedStateSnapshot {
  state: BubbleStateSnapshot;
  fingerprint: string;
}

export interface WriteStateSnapshotOptions {
  expectedFingerprint?: string;
  expectedState?: BubbleLifecycleState;
  lockTimeoutMs?: number;
}

export class StateStoreConflictError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "StateStoreConflictError";
  }
}

function fingerprintState(state: BubbleStateSnapshot): string {
  const normalized = JSON.stringify(state);
  return createHash("sha256").update(normalized).digest("hex");
}

function serializeState(state: BubbleStateSnapshot): string {
  return `${JSON.stringify(state, null, 2)}\n`;
}

export async function readStateSnapshot(
  statePath: string
): Promise<LoadedStateSnapshot> {
  const raw = await readFile(statePath, "utf8");
  const parsed = JSON.parse(raw) as unknown;
  const state = assertValidBubbleStateSnapshot(parsed);
  return {
    state,
    fingerprint: fingerprintState(state)
  };
}

async function atomicWriteState(
  statePath: string,
  state: BubbleStateSnapshot
): Promise<void> {
  const parentDir = dirname(statePath);
  const tempPath = join(parentDir, `.state-${randomUUID()}.tmp`);
  try {
    await writeFile(tempPath, serializeState(state), { encoding: "utf8" });
    await rename(tempPath, statePath);
  } catch (error) {
    await rm(tempPath, { force: true }).catch(() => undefined);
    throw error;
  }
}

async function withStateWriteLock<T>(
  statePath: string,
  timeoutMs: number,
  task: () => Promise<T>
): Promise<T> {
  const lockPath = `${statePath}.lock`;
  try {
    return await withFileLock(
      {
        lockPath,
        timeoutMs
      },
      task
    );
  } catch (error) {
    if (error instanceof FileLockTimeoutError) {
      throw new StateStoreConflictError(
        `Could not acquire state write lock: ${lockPath}`
      );
    }

    throw error;
  }
}

export async function createStateSnapshot(
  statePath: string,
  state: BubbleStateSnapshot
): Promise<LoadedStateSnapshot> {
  const validated = assertValidBubbleStateSnapshot(state);
  await writeFile(statePath, serializeState(validated), {
    encoding: "utf8",
    flag: "wx"
  });
  return {
    state: validated,
    fingerprint: fingerprintState(validated)
  };
}

export async function writeStateSnapshot(
  statePath: string,
  state: BubbleStateSnapshot,
  options: WriteStateSnapshotOptions = {}
): Promise<LoadedStateSnapshot> {
  const validated = assertValidBubbleStateSnapshot(state);
  return withStateWriteLock(
    statePath,
    options.lockTimeoutMs ?? 5_000,
    async () => {
      const current = await readStateSnapshot(statePath);

      if (
        options.expectedFingerprint !== undefined &&
        options.expectedFingerprint !== current.fingerprint
      ) {
        throw new StateStoreConflictError(
          "State fingerprint mismatch; possible concurrent update."
        );
      }

      if (
        options.expectedState !== undefined &&
        options.expectedState !== current.state.state
      ) {
        throw new StateStoreConflictError(
          `Expected current state ${options.expectedState} but found ${current.state.state}.`
        );
      }

      await atomicWriteState(statePath, validated);

      return {
        state: validated,
        fingerprint: fingerprintState(validated)
      };
    }
  );
}
