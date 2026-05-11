import type { BubbleStateSnapshot } from "../../domain/state/bubbleStateSnapshotTypes.js";
import type { ProtocolEnvelope } from "../../../types/protocol.js";

export interface CommitBubbleInput {
  bubbleId: string;
  refs?: string[] | undefined;
  message?: string | undefined;
  stageAll?: boolean | undefined;
  force?: boolean | undefined;
  /**
   * Temporary internal compatibility for first-party callers not yet migrated to
   * stageAll. Public CLI use of --auto is removed.
   */
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
}
