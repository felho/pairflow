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
  LoadedDomainStateSnapshot,
  LoadedStateSnapshot,
  ReadDomainStateSnapshotPort,
  ReadStateSnapshotPort,
  WriteDomainStateSnapshotPort
} from "../../ports/stateSnapshots.js";

export type {
  LoadedDomainStateSnapshot,
  LoadedStateSnapshot,
  ReadDomainStateSnapshotPort,
  ReadStateSnapshotPort,
  WriteDomainStateSnapshotPort
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
    state: loaded.state,
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
  state: PersistedBubbleStateSnapshot
): Promise<LoadedStateSnapshot> {
  const validated = assertParsedBubbleStateSnapshot(state);
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
  state: PersistedBubbleStateSnapshot,
  options: WriteStateSnapshotOptions = {}
): Promise<LoadedStateSnapshot> {
  const validated = assertParsedBubbleStateSnapshot(state);
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

// Variant-aware boundary functions — Step 4b-β opt-in API. The persisted
// shape stays the canonical wire format; these helpers project at the
// boundary so application/domain consumers can hold the variant union.
// Each function delegates to the persisted-shape implementation for the
// actual file I/O, then projects in the appropriate direction.

export const readDomainStateSnapshot: ReadDomainStateSnapshotPort = async (
  statePath: string
): Promise<LoadedDomainStateSnapshot> => {
  const loaded = await readStateSnapshot(statePath);
  return {
    state: buildBubbleStateSnapshotVariant(loaded.state),
    fingerprint: loaded.fingerprint
  };
};

export async function createDomainStateSnapshot(
  statePath: string,
  state: BubbleStateSnapshot
): Promise<LoadedDomainStateSnapshot> {
  const persisted = toPersistedSnapshot(state);
  const result = await createStateSnapshot(statePath, persisted);
  return {
    state: buildBubbleStateSnapshotVariant(result.state),
    fingerprint: result.fingerprint
  };
}

export const writeDomainStateSnapshot: WriteDomainStateSnapshotPort = async (
  statePath: string,
  state: BubbleStateSnapshot,
  options: WriteStateSnapshotOptions = {}
): Promise<LoadedDomainStateSnapshot> => {
  const persisted = toPersistedSnapshot(state);
  const result = await writeStateSnapshot(statePath, persisted, options);
  return {
    state: buildBubbleStateSnapshotVariant(result.state),
    fingerprint: result.fingerprint
  };
};

