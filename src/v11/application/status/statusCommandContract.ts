import type {
  BubbleRemotePointer
} from "../../shared/remote/remoteExecutionTypes.js";
import type { BubbleRemoteStateCache } from "../../shared/remote/remoteStateCacheTypes.js";
import type {
  ReadWatchdogPaneActivity
} from "../../shared/watchdog/watchdogPaneActivityStore.js";
import type { ResolveBubbleByIdPort } from "../../ports/bubbleLookup.js";
import type {
  ResolveRemoteBubbleStatusTargetPort
} from "../../shared/remote/commitRemoteExecution.js";
import type {
  RemoteBubbleStatusSnapshot,
  RemoteBubbleStatusTarget
} from "../../shared/status/remoteBubbleStatusContract.js";
import type {
  StatusGateStateDependencies,
  StatusTranscriptDataDependencies
} from "./internal/computation/statusCommandInternals.js";

export interface BubbleStatusInput {
  bubbleId: string;
  repoPath?: string | undefined;
  cwd?: string | undefined;
  now?: Date | undefined;
}

export interface BubbleStatusDependencies {
  inspectStateSnapshot: StatusTranscriptDataDependencies["inspectStateSnapshot"];
  readWatchdogPaneActivity: ReadWatchdogPaneActivity;
  readTranscriptEnvelopes: StatusTranscriptDataDependencies["readTranscriptEnvelopes"];
  readDocContractGateArtifact: StatusGateStateDependencies["readDocContractGateArtifact"];
  readReviewVerificationArtifactStatus:
    StatusGateStateDependencies["readReviewVerificationArtifactStatus"];
  resolveBubbleById: ResolveBubbleByIdPort;
  resolveDocContractGateArtifactPath:
    StatusGateStateDependencies["resolveDocContractGateArtifactPath"];
  readRemotePointer: (
    path: string
  ) => Promise<BubbleRemotePointer | null>;
  readRemoteStateCache: (
    path: string
  ) => Promise<BubbleRemoteStateCache | null>;
  writeRemoteStateCache: (
    path: string,
    value: BubbleRemoteStateCache
  ) => Promise<void>;
  resolveRemoteBubbleStatusTarget: ResolveRemoteBubbleStatusTargetPort;
  executeRemoteBubbleStatus: (input: {
    bubbleId: string;
    remoteClonePath: string;
    remoteTarget: RemoteBubbleStatusTarget;
  }) => Promise<RemoteBubbleStatusSnapshot>;
}
