import type {
  LoadedStateSnapshot,
  ReadStateSnapshotPort,
  WriteStateSnapshotOptions,
  WriteStateSnapshotPort
} from "../ports/stateSnapshots.js";

type CoreStateStoreModule = {
  readStateSnapshot: ReadStateSnapshotPort;
  writeStateSnapshot: WriteStateSnapshotPort;
};

let coreStateStoreModulePromise: Promise<CoreStateStoreModule> | undefined;

async function loadCoreStateStoreModule(): Promise<CoreStateStoreModule> {
  coreStateStoreModulePromise ??= import(
    "../../../core/state/stateStore.js"
  ).then(({ readStateSnapshot, writeStateSnapshot }) => ({
    readStateSnapshot,
    writeStateSnapshot
  }));
  return coreStateStoreModulePromise;
}

export const readStateSnapshot: ReadStateSnapshotPort = async (statePath) => {
  const module = await loadCoreStateStoreModule();
  return module.readStateSnapshot(statePath);
};

export const writeStateSnapshot: WriteStateSnapshotPort = async (
  statePath,
  state,
  options?: WriteStateSnapshotOptions
) => {
  const module = await loadCoreStateStoreModule();
  return module.writeStateSnapshot(statePath, state, options);
};

export type {
  LoadedStateSnapshot
};
