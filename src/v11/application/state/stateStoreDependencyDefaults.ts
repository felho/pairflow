import type {
  InspectedStateSnapshot,
  LoadedStateSnapshot,
  ReadStateSnapshotPort,
  WriteStateSnapshotPort
} from "../../shared/ports/stateSnapshots.js";

interface StateStoreDefaultsModule {
  inspectStateSnapshot: (statePath: string) => Promise<InspectedStateSnapshot>;
  readStateSnapshot: ReadStateSnapshotPort;
  writeStateSnapshot: WriteStateSnapshotPort;
}

let stateStoreDefaultsModulePromise:
  | Promise<StateStoreDefaultsModule>
  | undefined;

function getStateStoreDefaultsModulePath(): string {
  return "../../defaults/state/stateStoreDefaults.js";
}

async function loadStateStoreDefaultsModule():
  Promise<StateStoreDefaultsModule> {
  stateStoreDefaultsModulePromise ??= import(
    getStateStoreDefaultsModulePath()
  ) as Promise<StateStoreDefaultsModule>;
  return stateStoreDefaultsModulePromise;
}

export const readStateSnapshot: ReadStateSnapshotPort = async (...args) => {
  const { readStateSnapshot: readStateSnapshotDefault } =
    await loadStateStoreDefaultsModule();
  return readStateSnapshotDefault(...args);
};

export const inspectStateSnapshot = async (
  statePath: string
): Promise<InspectedStateSnapshot> => {
  const { inspectStateSnapshot: inspectStateSnapshotDefault } =
    await loadStateStoreDefaultsModule();
  return inspectStateSnapshotDefault(statePath);
};

export const writeStateSnapshot: WriteStateSnapshotPort = async (...args) => {
  const { writeStateSnapshot: writeStateSnapshotDefault } =
    await loadStateStoreDefaultsModule();
  return writeStateSnapshotDefault(...args);
};

export type {
  InspectedStateSnapshot,
  LoadedStateSnapshot
};
