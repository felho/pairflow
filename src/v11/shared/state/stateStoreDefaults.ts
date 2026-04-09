import type {
  LoadedStateSnapshot,
  ReadStateSnapshotPort,
  WriteStateSnapshotOptions,
  WriteStateSnapshotPort
} from "../ports/stateSnapshots.js";

type StateStoreModule = {
  readStateSnapshot: ReadStateSnapshotPort;
  writeStateSnapshot: WriteStateSnapshotPort;
};

let stateStoreModulePromise: Promise<StateStoreModule> | undefined;

async function loadStateStoreModule(): Promise<StateStoreModule> {
  stateStoreModulePromise ??= import(
    "../../infrastructure/state/stateStore.js"
  ).then(({ readStateSnapshot, writeStateSnapshot }) => ({
    readStateSnapshot,
    writeStateSnapshot
  }));
  return stateStoreModulePromise;
}

export const readStateSnapshot: ReadStateSnapshotPort = async (statePath) => {
  const module = await loadStateStoreModule();
  return module.readStateSnapshot(statePath);
};

export const writeStateSnapshot: WriteStateSnapshotPort = async (
  statePath,
  state,
  options?: WriteStateSnapshotOptions
) => {
  const module = await loadStateStoreModule();
  return module.writeStateSnapshot(statePath, state, options);
};

export type {
  LoadedStateSnapshot
};
