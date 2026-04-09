import { resolveBubbleById } from "../bubble/bubbleLookup.js";
import { readTranscriptEnvelopes } from "../protocol/transcriptStore.js";
import {
  inspectStateSnapshot,
  readStateSnapshot
} from "../state/stateStore.js";

export const statusInboxDependencyDefaults = {
  inspectStateSnapshot,
  readStateSnapshot,
  readTranscriptEnvelopes,
  resolveBubbleById
} as const;
