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
} from "../../shared/remote/commitRemoteExecution.js";

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

/**
 * Non-caller lower-level helper boundary for local commit side effects.
 *
 * This type remains exported because focused git and finalization helpers
 * (`internal/git/commitCommandGitStep.ts` and
 * `commitCommandFinalization.ts`) live in sub-areas separate from
 * `internal/pipeline/**`. It is not a public orchestration contract for
 * callers: route selection and side-effect ordering are owned by the
 * command-local pipeline.
 */
export interface CommitRuntimeContext extends CommitRuntimeContextBase {
  route: "local";
  loadedState: LoadedState;
  state: LoadedState["state"];
  appendProtocolEnvelope: AppendProtocolEnvelopePort;
  writeStateSnapshot: WriteStateSnapshotPort;
}

/**
 * Internal pipeline route context for remote commit execution.
 *
 * The export is retained only so the pipeline can share an explicit typed union
 * with the non-internal local helper boundary above. External callers should
 * treat remote route selection as an implementation detail of
 * `runCommitCommandPipeline(...)`, not as a caller-visible API surface.
 */
export interface RemoteCommitRuntimeContext extends CommitRuntimeContextBase {
  route: "remote";
  remotePointer: BubbleRemotePointerStarted;
  remoteTarget: CommitRemoteBubbleStatusTarget;
}

/**
 * Command-local execution context union used by the commit pipeline and its
 * retained lower-level helpers. This is not exported from `commitCommandApi.ts`
 * and does not authorize callers to orchestrate commit routes directly.
 */
export type CommitExecutionContext =
  | CommitRuntimeContext
  | RemoteCommitRuntimeContext;

export interface CommitGitResult {
  stagedFiles: string[];
  commitMessage: string;
  commitSha: string;
}
