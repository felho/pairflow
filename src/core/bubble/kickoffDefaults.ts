import { resolveBubbleById } from "./bubbleLookup.js";
import { appendProtocolEnvelope } from "../protocol/transcriptStore.js";
import { emitTmuxDeliveryNotification } from "../runtime/tmuxDelivery.js";
import { readStateSnapshot, writeStateSnapshot } from "../state/stateStore.js";

export const kickoffDefaults = {
  appendProtocolEnvelope,
  emitTmuxDeliveryNotification,
  readStateSnapshot,
  resolveBubbleById,
  writeStateSnapshot
} as const;
