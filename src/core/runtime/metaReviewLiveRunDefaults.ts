import { resolveBubbleById } from "../bubble/bubbleLookup.js";
import { appendProtocolEnvelope } from "../protocol/transcriptStore.js";
import { readStateSnapshot, writeStateSnapshot } from "../state/stateStore.js";

export const metaReviewLiveRunDefaults = {
  appendProtocolEnvelope,
  readStateSnapshot,
  resolveBubbleById,
  writeStateSnapshot
} as const;
