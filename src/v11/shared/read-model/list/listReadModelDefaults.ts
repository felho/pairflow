import type {
  BubbleRemotePointer,
  BubbleRemoteStateCache
} from "../../../../types/bubble.js";
import type {
  ResolveRemoteBubbleStatusTargetPort
} from "../../remote/commitRemoteExecution.js";
import type {
  RemoteBubbleStatusSnapshot,
  RemoteBubbleStatusTarget
} from "../../status/remoteBubbleStatusContract.js";
import type {
  InspectedStateSnapshot
} from "../../ports/stateSnapshots.js";
import type {
  ReadRuntimeSessionsRegistryPort
} from "../../ports/runtimeSessions.js";
import type {
  ResolveRepoPathPort
} from "../../ports/repoResolution.js";
import type {
  ReadWatchdogPaneActivityPort
} from "../../ports/watchdogPaneActivity.js";

type ReadRemotePointerPort = (
  path: string
) => Promise<BubbleRemotePointer | null>;
type ReadRemoteStateCachePort = (
  path: string
) => Promise<BubbleRemoteStateCache | null>;
type WriteRemoteStateCachePort = (
  path: string,
  value: BubbleRemoteStateCache
) => Promise<void>;
type ExecuteRemoteBubbleStatusPort = (input: {
  bubbleId: string;
  remoteClonePath: string;
  remoteTarget: RemoteBubbleStatusTarget;
}) => Promise<RemoteBubbleStatusSnapshot>;

interface ListReadModelDefaults {
  executeRemoteBubbleStatus: ExecuteRemoteBubbleStatusPort;
  inspectStateSnapshot: (
    statePath: string
  ) => Promise<InspectedStateSnapshot>;
  listBubbleIds: (repoPath: string) => Promise<string[]>;
  normalizeRepoPath: (path: string) => Promise<string>;
  readBubbleTomlArtifact: (path: string) => Promise<string>;
  readRemotePointer: ReadRemotePointerPort;
  readRemoteStateCache: ReadRemoteStateCachePort;
  readRuntimeSessionsRegistry: ReadRuntimeSessionsRegistryPort;
  readWatchdogPaneActivity: ReadWatchdogPaneActivityPort;
  resolveRemoteBubbleStatusTarget: ResolveRemoteBubbleStatusTargetPort;
  resolveRepoPath: ResolveRepoPathPort;
  writeRemoteStateCache: WriteRemoteStateCachePort;
}

interface ListCommandDefaultsModule {
  listCommandDefaults: ListReadModelDefaults;
}

let listCommandDefaultsModulePromise:
  | Promise<ListCommandDefaultsModule>
  | undefined;

function getListCommandDefaultsModulePath(): string {
  return "../../../defaults/list/listCommandDefaults.js";
}

async function loadListCommandDefaultsModule():
  Promise<ListCommandDefaultsModule> {
  listCommandDefaultsModulePromise ??= import(
    getListCommandDefaultsModulePath()
  ) as Promise<ListCommandDefaultsModule>;
  return listCommandDefaultsModulePromise;
}

const listReadModelDefaultsPromise = loadListCommandDefaultsModule()
  .then(({ listCommandDefaults }) => listCommandDefaults);

export const listReadModelDefaults = await listReadModelDefaultsPromise;
