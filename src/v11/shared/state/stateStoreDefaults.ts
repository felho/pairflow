import {
  readStateSnapshot as readStateSnapshotCore,
  writeStateSnapshot as writeStateSnapshotCore
} from "../../../core/state/stateStore.js";
import type {
  LoadedStateSnapshot,
  ReadStateSnapshotPort,
  WriteStateSnapshotOptions,
  WriteStateSnapshotPort
} from "../ports/stateSnapshots.js";

export const readStateSnapshot: ReadStateSnapshotPort = async (statePath) =>
  readStateSnapshotCore(statePath);

export const writeStateSnapshot: WriteStateSnapshotPort = async (
  statePath,
  state,
  options?: WriteStateSnapshotOptions
) => writeStateSnapshotCore(statePath, state, options);

export type {
  LoadedStateSnapshot
};
