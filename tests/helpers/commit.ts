import { appendProtocolEnvelope, readTranscriptEnvelopes } from "../../src/v11/infrastructure/artifact/transcript/transcriptStore.js";
import { ensureBubbleInstanceIdForMutation } from "../../src/v11/infrastructure/artifact/bubble/bubbleInstanceId.js";
import { resolveBubbleById } from "../../src/v11/infrastructure/executor/workspace/bubbleLookup.js";
import { readStateSnapshot, writeStateSnapshot } from "../../src/v11/infrastructure/state/stateStore.js";
import { runGit } from "../../src/v11/infrastructure/workspace/git.js";
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
