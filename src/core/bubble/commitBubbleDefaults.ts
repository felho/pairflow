import { appendProtocolEnvelope, readTranscriptEnvelopes } from "../protocol/transcriptStore.js";
import { ensureBubbleInstanceIdForMutation } from "./bubbleInstanceId.js";
import { resolveBubbleById } from "./bubbleLookup.js";
import { readStateSnapshot, writeStateSnapshot } from "../state/stateStore.js";
import { runGit } from "../workspace/git.js";

export const commitBubbleDependencyDefaults = {
  appendProtocolEnvelope,
  ensureBubbleInstanceIdForMutation,
  readStateSnapshot,
  readTranscriptEnvelopes,
  resolveBubbleById,
  runGit,
  writeStateSnapshot
} as const;
