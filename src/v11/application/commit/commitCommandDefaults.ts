import { ensureBubbleInstanceIdForMutation } from "../../defaults/bubbleIdentity/bubbleIdentityDefaults.js";
import { runGit } from "../../defaults/git/gitDefaults.js";
import { resolveBubbleById } from "../../shared/bubbleLookup/bubbleLookupDefaults.js";
import {
  readStateSnapshot,
  writeStateSnapshot
} from "../../shared/state/stateStoreDefaults.js";
import {
  appendProtocolEnvelope,
  readTranscriptEnvelopes
} from "../../shared/transcript/transcriptDependencyDefaults.js";

export const commitBubbleDependencyDefaults = {
  appendProtocolEnvelope,
  ensureBubbleInstanceIdForMutation,
  readStateSnapshot,
  readTranscriptEnvelopes,
  resolveBubbleById,
  runGit,
  writeStateSnapshot
} as const;
