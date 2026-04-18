import type {
  BubbleRemotePointerCreated,
  BubbleRemotePointerStarted,
  BubbleStateSnapshot
} from "../../../types/bubble.js";
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
  auto: boolean;
}

export interface ExecuteRemoteBubbleCommitCommandResult {
  bubbleId: string;
  sequence: number;
  envelope: ProtocolEnvelope;
  state: BubbleStateSnapshot;
  stateContent: string;
  transcriptContent: string;
  donePackageContent: string;
  commitSha: string;
  commitMessage: string;
  stagedFiles: string[];
}

export type ExecuteRemoteBubbleCommitCommandPort = (
  input: ExecuteRemoteBubbleCommitCommandInput
) => Promise<ExecuteRemoteBubbleCommitCommandResult>;

export type ResolveRemoteBubbleStatusTargetPort = (input: {
  bubbleId: string;
  remoteAlias: string;
  expectedHost?: string;
}) => Promise<CommitRemoteBubbleStatusTarget>;

export type ReadRemoteCommitPointerPort = (
  path: string
) => Promise<BubbleRemotePointerStarted | BubbleRemotePointerCreated | null>;
