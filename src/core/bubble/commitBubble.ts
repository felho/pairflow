import { appendProtocolEnvelope, readTranscriptEnvelopes } from "../protocol/transcriptStore.js";
import { ensureBubbleInstanceIdForMutation } from "../../v11/infrastructure/artifact/bubble/bubbleInstanceId.js";
import { resolveBubbleById } from "../../v11/infrastructure/executor/workspace/bubbleLookup.js";
import { readStateSnapshot, writeStateSnapshot } from "../state/stateStore.js";
import { runGit } from "../../v11/infrastructure/workspace/git.js";
import { commitBubbleV11 } from "../../v11/application/commit/emitCommitV11.js";
import type { CommitBubbleDependencies } from "../../v11/application/commit/commitCommandApiContract.js";
import type {
  CommitBubbleInput,
  CommitBubbleResult
} from "../../v11/application/commit/commitCommandContract.js";
import {
  BubbleCommitErrorV11,
  asBubbleCommitErrorV11
} from "../../v11/application/commit/emitCommitV11.js";

const defaultCommitBubbleDependencies: CommitBubbleDependencies = {
  appendProtocolEnvelope,
  ensureBubbleInstanceIdForMutation,
  readStateSnapshot,
  readTranscriptEnvelopes,
  resolveBubbleById,
  runGit,
  writeStateSnapshot
};

export async function commitBubble(
  input: CommitBubbleInput
): Promise<CommitBubbleResult> {
  return commitBubbleV11(input, defaultCommitBubbleDependencies);
}

export { asBubbleCommitErrorV11 as asBubbleCommitError, BubbleCommitErrorV11 as BubbleCommitError };
export type { CommitBubbleInput, CommitBubbleResult } from "../../v11/application/commit/commitCommandContract.js";
