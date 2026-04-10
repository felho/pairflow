import {
  inspectStateSnapshot as inspectStateSnapshotDefaults,
  readStateSnapshot as readStateSnapshotDefaults,
  writeStateSnapshot as writeStateSnapshotDefaults
} from "../../defaults/state/stateStoreDefaults.js";
import type {
  InspectedStateSnapshot,
  LoadedStateSnapshot,
  ReadStateSnapshotPort,
  WriteStateSnapshotOptions,
  WriteStateSnapshotPort
} from "../ports/stateSnapshots.js";

export const readStateSnapshot: ReadStateSnapshotPort = async (statePath) =>
  readStateSnapshotDefaults(statePath);

export const inspectStateSnapshot = async (
  statePath: string
): Promise<InspectedStateSnapshot> => inspectStateSnapshotDefaults(statePath);

export const writeStateSnapshot: WriteStateSnapshotPort = async (
  statePath,
  state,
  options?: WriteStateSnapshotOptions
) => writeStateSnapshotDefaults(statePath, state, options);

export type {
  InspectedStateSnapshot,
  LoadedStateSnapshot
};
