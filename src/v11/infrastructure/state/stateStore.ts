import { dirname, join } from "node:path";
import { randomUUID } from "node:crypto";
import { rename, rm, writeFile } from "node:fs/promises";

import type { BubbleStateSnapshot } from "../../domain/state/snapshot/bubbleStateSnapshot.js";
import { buildBubbleStateSnapshotVariant } from "../../domain/state/snapshot/buildBubbleStateSnapshot.js";
import { toPersistedSnapshot } from "../../domain/state/snapshot/projection.js";
import { assertParsedBubbleStateSnapshot } from "../../domain/state/stateSchema.js";
import {
  FileLockTimeoutError,
  withFileLock
} from "../foundation/fs/fileLock.js";
import {
  fingerprintState,
  inspectStateSnapshot
} from "./stateSnapshotInspection.js";
import type { BubbleLifecycleState } from "../../../contracts/kernel/lifecycle.js";
import type { PersistedBubbleStateSnapshot } from "../../domain/state/snapshot/persistedBubbleStateSnapshot.js";
import { SchemaValidationError } from "../../shared/validation/primitives.js";
import type {
  LoadedStateSnapshot,
  ReadStateSnapshotPort,
  WriteStateSnapshotPort
} from "../../ports/stateSnapshots.js";

export type {
  LoadedStateSnapshot,
  ReadStateSnapshotPort,
  WriteStateSnapshotPort
} from "../../ports/stateSnapshots.js";

export type {
  StateValidationDiagnostics,
  InspectedStateSnapshot
} from "./stateSnapshotInspection.js";
export { inspectStateSnapshot } from "./stateSnapshotInspection.js";

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

function serializeState(state: PersistedBubbleStateSnapshot): string {
  return `${JSON.stringify(state, null, 2)}\n`;
}

export const readStateSnapshot: ReadStateSnapshotPort = async (
  statePath: string
): Promise<LoadedStateSnapshot> => {
  const loaded = await inspectStateSnapshot(statePath);
  if (loaded.stateValidation !== null) {
    throw new SchemaValidationError(
      loaded.stateValidation.message,
      loaded.stateValidation.errors
    );
  }
  return {
    state: buildBubbleStateSnapshotVariant(loaded.state),
    fingerprint: loaded.fingerprint
  };
};

async function atomicWriteState(
  statePath: string,
  state: PersistedBubbleStateSnapshot
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

export async function withStateWriteLock<T>(
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
  // Wire format is persisted-shape; the canonical parser now returns the
  // variant union, so re-validate via assertParsedBubbleStateSnapshot
  // (which projects through buildBubbleStateSnapshotVariant internally) and
  // serialize via toPersistedSnapshot.
  const validatedVariant = assertParsedBubbleStateSnapshot(toPersistedSnapshot(state));
  const validatedPersisted = toPersistedSnapshot(validatedVariant);
  await writeFile(statePath, serializeState(validatedPersisted), {
    encoding: "utf8",
    flag: "wx"
  });
  return {
    state: validatedVariant,
    fingerprint: fingerprintState(validatedPersisted)
  };
}

export const writeStateSnapshot: WriteStateSnapshotPort = async (
  statePath: string,
  state: BubbleStateSnapshot,
  options: WriteStateSnapshotOptions = {}
): Promise<LoadedStateSnapshot> => {
  const validatedVariant = assertParsedBubbleStateSnapshot(toPersistedSnapshot(state));
  const validatedPersisted = toPersistedSnapshot(validatedVariant);
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

      await atomicWriteState(statePath, validatedPersisted);

      return {
        state: validatedVariant,
        fingerprint: fingerprintState(validatedPersisted)
      };
    }
  );
};
