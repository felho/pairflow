import type { BubbleStateSnapshot } from "../../../types/bubble.js";
import type { ProtocolEnvelope } from "../../../types/protocol.js";

export interface CommitBubbleInput {
  bubbleId: string;
  refs?: string[] | undefined;
  message?: string | undefined;
  auto?: boolean | undefined;
  repoPath?: string | undefined;
  cwd?: string | undefined;
  now?: Date | undefined;
}

export interface CommitBubbleResult {
  bubbleId: string;
  sequence: number;
  envelope: ProtocolEnvelope;
  state: BubbleStateSnapshot;
  commitSha: string;
  commitMessage: string;
  stagedFiles: string[];
  donePackagePath: string;
}
