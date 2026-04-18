import type {
  BubbleRemotePointerCreated,
  BubbleRemotePointerStarted
} from "../../../types/bubble.js";
import type {
  EnsureBubbleInstanceIdForMutationResult
} from "../../shared/ports/bubbleIdentity.js";
import type {
  EnsureBubbleInstanceIdForMutationPort
} from "../../shared/ports/bubbleIdentity.js";
import type { ResolvedBubbleById } from "../../shared/ports/bubbleLookup.js";
import type { ResolveBubbleByIdPort } from "../../shared/ports/bubbleLookup.js";
import type {
  LoadedStateSnapshot
} from "../../shared/ports/stateSnapshots.js";
import type {
  ReadStateSnapshotPort,
  WriteStateSnapshotPort
} from "../../shared/ports/stateSnapshots.js";
import type {
  AppendProtocolEnvelopePort,
  AppendProtocolEnvelopeResult,
  ReadTranscriptEnvelopesPort
} from "../../shared/ports/transcript.js";
import type { RunGitPort } from "../../shared/ports/git.js";
import type { RemoteBubbleStatusTarget } from "../../infrastructure/executor/ssh/sshBubbleStatus.js";
import type {
  ExecuteRemoteBubbleCommitCommandInput,
  ExecuteRemoteBubbleCommitCommandResult
} from "../../infrastructure/executor/ssh/sshBubbleCommitCommand.js";

export type ResolvedBubbleContext = ResolvedBubbleById;
export type BubbleIdentity = EnsureBubbleInstanceIdForMutationResult;
export type LoadedState = LoadedStateSnapshot;
export type AppendedEnvelope = AppendProtocolEnvelopeResult;
export type WrittenState = LoadedStateSnapshot;

export interface CommitBubbleDependencies {
  appendProtocolEnvelope: AppendProtocolEnvelopePort;
  executeRemoteBubbleCommitCommand: (
    input: ExecuteRemoteBubbleCommitCommandInput
  ) => Promise<ExecuteRemoteBubbleCommitCommandResult>;
  ensureBubbleInstanceIdForMutation: EnsureBubbleInstanceIdForMutationPort;
  readRemotePointer: (
    path: string
  ) => Promise<BubbleRemotePointerStarted | BubbleRemotePointerCreated | null>;
  readStateSnapshot: ReadStateSnapshotPort;
  readTranscriptEnvelopes: ReadTranscriptEnvelopesPort;
  resolveRemoteBubbleStatusTarget: (input: {
    bubbleId: string;
    remoteAlias: string;
    expectedHost?: string;
  }) => Promise<RemoteBubbleStatusTarget>;
  resolveBubbleById: ResolveBubbleByIdPort;
  runGit: RunGitPort;
  renamePath?: (fromPath: string, toPath: string) => Promise<void>;
  writeTextFile: (path: string, content: string) => Promise<void>;
  writeStateSnapshot: WriteStateSnapshotPort;
}

interface CommitRuntimeContextBase {
  resolved: ResolvedBubbleContext;
  bubbleIdentity: BubbleIdentity;
  donePackagePath: string;
}

export interface CommitRuntimeContext extends CommitRuntimeContextBase {
  route: "local";
  loadedState: LoadedState;
  state: LoadedState["state"];
  appendProtocolEnvelope: AppendProtocolEnvelopePort;
  writeStateSnapshot: WriteStateSnapshotPort;
  donePackageContent: string;
}

export interface RemoteCommitRuntimeContext extends CommitRuntimeContextBase {
  route: "remote";
  remotePointer: BubbleRemotePointerStarted;
  remoteTarget: RemoteBubbleStatusTarget;
}

export type CommitExecutionContext =
  | CommitRuntimeContext
  | RemoteCommitRuntimeContext;

export interface CommitGitResult {
  stagedFiles: string[];
  commitMessage: string;
  commitSha: string;
}
