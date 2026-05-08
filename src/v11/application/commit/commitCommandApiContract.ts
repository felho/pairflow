import type {
  BubbleRemotePointerStarted
} from "../../shared/remote/remoteExecutionTypes.js";
import type {
  EnsureBubbleInstanceIdForMutationResult
} from "../../ports/bubbleIdentity.js";
import type {
  EnsureBubbleInstanceIdForMutationPort
} from "../../ports/bubbleIdentity.js";
import type { ResolvedBubbleById } from "../../ports/bubbleLookup.js";
import type { ResolveBubbleByIdPort } from "../../ports/bubbleLookup.js";
import type {
  LoadedStateSnapshot
} from "../../ports/stateSnapshots.js";
import type {
  ReadStateSnapshotPort,
  WriteStateSnapshotPort
} from "../../ports/stateSnapshots.js";
import type {
  AppendProtocolEnvelopePort,
  AppendProtocolEnvelopeResult,
  ReadTranscriptEnvelopesPort
} from "../../ports/transcript.js";
import type { RunGitPort } from "../../ports/git.js";
import type {
  CommitRemoteBubbleStatusTarget,
  ExecuteRemoteBubbleCommitCommandPort,
  ImportRemoteBubbleCommitContinuityPort,
  ReadRemoteCommitPointerPort,
  ResolveRemoteBubbleStatusTargetPort
} from "./commitRemotePorts.js";

export type ResolvedBubbleContext = ResolvedBubbleById;
export type BubbleIdentity = EnsureBubbleInstanceIdForMutationResult;
export type LoadedState = LoadedStateSnapshot;
export type AppendedEnvelope = AppendProtocolEnvelopeResult;
export type WrittenState = LoadedStateSnapshot;

export interface CommitBubbleDependencies {
  appendProtocolEnvelope: AppendProtocolEnvelopePort;
  executeRemoteBubbleCommitCommand: ExecuteRemoteBubbleCommitCommandPort;
  importRemoteBubbleCommitContinuity: ImportRemoteBubbleCommitContinuityPort;
  ensureBubbleInstanceIdForMutation: EnsureBubbleInstanceIdForMutationPort;
  readRemotePointer: ReadRemoteCommitPointerPort;
  readStateSnapshot: ReadStateSnapshotPort;
  readTranscriptEnvelopes: ReadTranscriptEnvelopesPort;
  resolveRemoteBubbleStatusTarget: ResolveRemoteBubbleStatusTargetPort;
  resolveBubbleById: ResolveBubbleByIdPort;
  runGit: RunGitPort;
  renamePath?: (fromPath: string, toPath: string) => Promise<void>;
  writeTextFile: (path: string, content: string) => Promise<void>;
  writeStateSnapshot: WriteStateSnapshotPort;
}

interface CommitRuntimeContextBase {
  resolved: ResolvedBubbleContext;
  bubbleIdentity: BubbleIdentity;
}

export interface CommitRuntimeContext extends CommitRuntimeContextBase {
  route: "local";
  loadedState: LoadedState;
  state: LoadedState["state"];
  appendProtocolEnvelope: AppendProtocolEnvelopePort;
  writeStateSnapshot: WriteStateSnapshotPort;
}

export interface RemoteCommitRuntimeContext extends CommitRuntimeContextBase {
  route: "remote";
  remotePointer: BubbleRemotePointerStarted;
  remoteTarget: CommitRemoteBubbleStatusTarget;
}

export type CommitExecutionContext =
  | CommitRuntimeContext
  | RemoteCommitRuntimeContext;

export interface CommitGitResult {
  stagedFiles: string[];
  commitMessage: string;
  commitSha: string;
}
