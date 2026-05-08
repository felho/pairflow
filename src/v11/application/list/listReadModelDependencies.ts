import type {
  BubbleRemotePointer,
  BubbleRemoteStateCache
} from "../../../types/bubble.js";
import type { ResolveRemoteBubbleStatusTargetPort } from "../../shared/remote/commitRemoteExecution.js";
import type {
  RemoteBubbleStatusSnapshot,
  RemoteBubbleStatusTarget
} from "../../shared/status/remoteBubbleStatusContract.js";
import type { InspectedStateSnapshot } from "../../ports/stateSnapshots.js";
import type { ReadRuntimeSessionsRegistryPort } from "../../ports/runtimeSessions.js";
import type { ResolveRepoPathPort } from "../../ports/repoResolution.js";
import type { ReadWatchdogPaneActivityPort } from "../../ports/watchdogPaneActivity.js";

export type ReadRemotePointerPort = (
  path: string
) => Promise<BubbleRemotePointer | null>;

export type ReadRemoteStateCachePort = (
  path: string
) => Promise<BubbleRemoteStateCache | null>;

export type WriteRemoteStateCachePort = (
  path: string,
  value: BubbleRemoteStateCache
) => Promise<void>;

export type ExecuteRemoteBubbleStatusPort = (input: {
  bubbleId: string;
  remoteClonePath: string;
  remoteTarget: RemoteBubbleStatusTarget;
}) => Promise<RemoteBubbleStatusSnapshot>;

export interface ListReadModelDependencies {
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
