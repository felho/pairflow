import {
  inspectStateSnapshot as inspectStateSnapshotCanonical,
  readStateSnapshot as readStateSnapshotCanonical,
  writeStateSnapshot as writeStateSnapshotCanonical
} from "../../infrastructure/state/stateStore.js";
import type {
  InspectedStateSnapshot,
  LoadedStateSnapshot,
  ReadStateSnapshotPort,
  WriteStateSnapshotOptions,
  WriteStateSnapshotPort
} from "../../ports/stateSnapshots.js";

export const readStateSnapshot: ReadStateSnapshotPort = async (statePath) =>
  readStateSnapshotCanonical(statePath);

export const inspectStateSnapshot = async (
  statePath: string
): Promise<InspectedStateSnapshot> => inspectStateSnapshotCanonical(statePath);

export const writeStateSnapshot: WriteStateSnapshotPort = async (
  statePath,
  state,
  options?: WriteStateSnapshotOptions
) => writeStateSnapshotCanonical(statePath, state, options);

export type {
  InspectedStateSnapshot,
  LoadedStateSnapshot
};
