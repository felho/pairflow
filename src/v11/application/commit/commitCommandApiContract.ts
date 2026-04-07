import type {
  EnsureBubbleInstanceIdForMutationResult
} from "../../shared/ports/bubbleIdentity.js";
import type { ResolvedBubbleById } from "../../shared/ports/bubbleLookup.js";
import type {
  LoadedStateSnapshot
} from "../../shared/ports/stateSnapshots.js";
import type {
  WriteStateSnapshotPort
} from "../../shared/ports/stateSnapshots.js";
import type {
  AppendProtocolEnvelopePort,
  AppendProtocolEnvelopeResult
} from "../../shared/ports/transcript.js";

export type ResolvedBubbleContext = ResolvedBubbleById;
export type BubbleIdentity = EnsureBubbleInstanceIdForMutationResult;
export type LoadedState = LoadedStateSnapshot;
export type AppendedEnvelope = AppendProtocolEnvelopeResult;
export type WrittenState = LoadedStateSnapshot;

export interface CommitRuntimeContext {
  resolved: ResolvedBubbleContext;
  bubbleIdentity: BubbleIdentity;
  loadedState: LoadedState;
  state: LoadedState["state"];
  appendProtocolEnvelope: AppendProtocolEnvelopePort;
  writeStateSnapshot: WriteStateSnapshotPort;
  donePackagePath: string;
  donePackageContent: string;
}

export interface CommitGitResult {
  stagedFiles: string[];
  commitMessage: string;
  commitSha: string;
}
