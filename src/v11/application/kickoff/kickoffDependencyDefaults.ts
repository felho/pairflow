import {
  reviewerDeliveryDefaults
} from "../pass/reviewerDeliveryDefaults.js";
import {
  appendProtocolEnvelope
} from "../transcript/transcriptDependencyDefaults.js";
import {
  readStateSnapshot,
  writeStateSnapshot
} from "../state/stateStoreDependencyDefaults.js";
import {
  resolveBubbleById
} from "../start/startCommandDependencyDefaults.js";

export const kickoffDefaults = {
  appendProtocolEnvelope,
  emitDeliveryNotificationAck: reviewerDeliveryDefaults.emitDeliveryNotificationAck,
  readStateSnapshot,
  resolveBubbleById,
  writeStateSnapshot
} as const;
