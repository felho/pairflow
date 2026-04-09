import {
  readStateSnapshot as readStateSnapshotCanonical,
  writeStateSnapshot as writeStateSnapshotCanonical
} from "../../infrastructure/state/stateStore.js";
import type {
  LoadedStateSnapshot,
  ReadStateSnapshotPort,
  WriteStateSnapshotOptions,
  WriteStateSnapshotPort
} from "../../shared/ports/stateSnapshots.js";

export const readStateSnapshot: ReadStateSnapshotPort = async (statePath) =>
  readStateSnapshotCanonical(statePath);

export const writeStateSnapshot: WriteStateSnapshotPort = async (
  statePath,
  state,
  options?: WriteStateSnapshotOptions
) => writeStateSnapshotCanonical(statePath, state, options);

export type {
  LoadedStateSnapshot
};
