import type {
  BubbleRemotePointerCreated,
  BubbleRemotePointerStarted
} from "./remoteExecutionTypes.js";
import type { PersistedBubbleStateSnapshot } from "../../domain/state/snapshot/persistedBubbleStateSnapshot.js";
import type { ProtocolEnvelope } from "../../../types/protocol.js";

export interface CommitRemoteBubbleStatusTarget {
  alias: string;
  host: string;
  user?: string;
  pairflowCommand: string;
}

export interface ExecuteRemoteBubbleCommitCommandInput {
  bubbleId: string;
  remoteClonePath: string;
  remoteTarget: CommitRemoteBubbleStatusTarget;
  refs: string[];
  message?: string;
  stageAll: boolean;
}

export interface ExecuteRemoteBubbleCommitCommandResult {
  bubbleId: string;
  sequence: number;
  envelope: ProtocolEnvelope;
  state: PersistedBubbleStateSnapshot;
  stateContent: string;
  transcriptContent: string;
  commitSha: string;
  commitMessage: string;
  stagedFiles: string[];
}

export type ExecuteRemoteBubbleCommitCommandPort = (
  input: ExecuteRemoteBubbleCommitCommandInput
) => Promise<ExecuteRemoteBubbleCommitCommandResult>;

export interface ImportRemoteBubbleCommitContinuityInput {
  bubbleId: string;
  remoteClonePath: string;
  remoteTarget: CommitRemoteBubbleStatusTarget;
}

export type ImportRemoteBubbleCommitContinuityResult =
  | ({
      classification: "imported_remote_completion";
    } & ExecuteRemoteBubbleCommitCommandResult)
  | {
      classification: "no_remote_completion_evidence";
      reason: string;
    };

export type ImportRemoteBubbleCommitContinuityPort = (
  input: ImportRemoteBubbleCommitContinuityInput
) => Promise<ImportRemoteBubbleCommitContinuityResult>;

export type ResolveRemoteBubbleStatusTargetPort = (input: {
  bubbleId: string;
  remoteAlias: string;
  expectedHost?: string;
}) => Promise<CommitRemoteBubbleStatusTarget>;

export type ReadRemoteCommitPointerPort = (
  path: string
) => Promise<BubbleRemotePointerStarted | BubbleRemotePointerCreated | null>;
