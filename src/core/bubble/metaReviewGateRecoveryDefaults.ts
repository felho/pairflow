import { resolveBubbleById } from "./bubbleLookup.js";
import { appendProtocolEnvelope, readTranscriptEnvelopes } from "../protocol/transcriptStore.js";
import { setMetaReviewerPaneBinding } from "../runtime/sessionsRegistry.js";
import { readStateSnapshot, writeStateSnapshot } from "../state/stateStore.js";

export type {
  LoadedStateSnapshot
} from "../state/stateStore.js";

export const metaReviewGateRecoveryDefaults = {
  appendProtocolEnvelope,
  readStateSnapshot,
  readTranscriptEnvelopes,
  resolveBubbleById,
  setMetaReviewerPaneBinding,
  writeStateSnapshot
} as const;
