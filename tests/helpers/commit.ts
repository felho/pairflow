import { appendProtocolEnvelope, readTranscriptEnvelopes } from "../../src/core/protocol/transcriptStore.js";
import { ensureBubbleInstanceIdForMutation } from "../../src/core/bubble/bubbleInstanceId.js";
import { resolveBubbleById } from "../../src/core/bubble/bubbleLookup.js";
import { readStateSnapshot, writeStateSnapshot } from "../../src/core/state/stateStore.js";
import { runGit } from "../../src/core/workspace/git.js";
import type { CommitBubbleDependencies } from "../../src/v11/application/commit/commitCommandApiContract.js";

export function buildCommitBubbleDependencies(): CommitBubbleDependencies {
  return {
    appendProtocolEnvelope,
    ensureBubbleInstanceIdForMutation,
    readStateSnapshot,
    readTranscriptEnvelopes,
    resolveBubbleById,
    runGit,
    writeStateSnapshot
  };
}
