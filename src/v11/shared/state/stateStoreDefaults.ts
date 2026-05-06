import type {
  InspectedStateSnapshot,
  LoadedStateSnapshot,
  ReadStateSnapshotPort,
  WriteStateSnapshotOptions,
  WriteStateSnapshotPort
} from "../ports/stateSnapshots.js";

interface StateStoreDefaultsModule {
  inspectStateSnapshot: (
    statePath: string
  ) => Promise<InspectedStateSnapshot>;
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

export const readStateSnapshot: ReadStateSnapshotPort = async (statePath) => {
  const { readStateSnapshot: readStateSnapshotDefault } =
    await loadStateStoreDefaultsModule();
  return readStateSnapshotDefault(statePath);
};

export const inspectStateSnapshot = async (
  statePath: string
): Promise<InspectedStateSnapshot> => {
  const { inspectStateSnapshot: inspectStateSnapshotDefault } =
    await loadStateStoreDefaultsModule();
  return inspectStateSnapshotDefault(statePath);
};

export const writeStateSnapshot: WriteStateSnapshotPort = async (
  statePath,
  state,
  options?: WriteStateSnapshotOptions
) => {
  const { writeStateSnapshot: writeStateSnapshotDefault } =
    await loadStateStoreDefaultsModule();
  return writeStateSnapshotDefault(statePath, state, options);
};

export type {
  InspectedStateSnapshot,
  LoadedStateSnapshot
};
