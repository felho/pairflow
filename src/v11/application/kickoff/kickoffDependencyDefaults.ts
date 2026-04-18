import { openBubbleDefaults } from "../open/openBubbleDefaults.js";
import {
  reviewerDeliveryDefaults
} from "../pass/reviewerDeliveryDefaults.js";
import {
  appendProtocolEnvelope
} from "../../shared/transcript/transcriptDependencyDefaults.js";
import {
  readStateSnapshot,
  writeStateSnapshot
} from "../../shared/state/stateStoreDefaults.js";

export const kickoffDefaults = {
  appendProtocolEnvelope,
  emitDeliveryNotificationAck: reviewerDeliveryDefaults.emitDeliveryNotificationAck,
  readStateSnapshot,
  resolveBubbleById: openBubbleDefaults.resolveBubbleById,
  writeStateSnapshot
} as const;
