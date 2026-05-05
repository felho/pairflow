import type { StopBubbleDependencies } from "./stopCommandContract.js";
import type { ResolveBubbleByIdPort } from "../../shared/ports/bubbleLookup.js";
import type {
  LoadedStateSnapshot,
  ReadStateSnapshotPort,
  WriteStateSnapshotPort
} from "../../shared/ports/stateSnapshots.js";

type ExecuteStopCancellationMutationPort = (input: {
  statePath: string;
  loadedState: LoadedStateSnapshot;
  nowIso: string;
  writeStateSnapshot: WriteStateSnapshotPort;
}) => Promise<LoadedStateSnapshot>;

type StopCommandDefaultsModule = {
  stopBubbleDependencyDefaults: Required<StopBubbleDependencies> & {
    executeStopCancellationMutation: ExecuteStopCancellationMutationPort;
    readStateSnapshot: ReadStateSnapshotPort;
    resolveBubbleById: ResolveBubbleByIdPort;
  };
};

function getStopCommandDefaultsModulePath(): string {
  return ["..", "..", "defaults", "stop", "stopCommandDefaults.js"].join("/");
}

const stopCommandDefaultsPromise = import(
  getStopCommandDefaultsModulePath()
).then(
  ({ stopBubbleDependencyDefaults }: StopCommandDefaultsModule) =>
    stopBubbleDependencyDefaults
);

export const stopCommandDefaults = await stopCommandDefaultsPromise;
