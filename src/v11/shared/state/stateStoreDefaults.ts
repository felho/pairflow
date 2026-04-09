import type {
  LoadedStateSnapshot,
  ReadStateSnapshotPort,
  WriteStateSnapshotOptions,
  WriteStateSnapshotPort
} from "../ports/stateSnapshots.js";

type CoreStateStoreModule = typeof import("../../../core/state/stateStore.js");

let coreStateStoreModulePromise: Promise<CoreStateStoreModule> | undefined;

async function loadCoreStateStoreModule() {
  coreStateStoreModulePromise ??= import("../../../core/state/stateStore.js");
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
