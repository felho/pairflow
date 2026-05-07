import {
  reviewerDeliveryDefaults
} from "../pass/reviewerDeliveryDefaults.js";
import {
  appendProtocolEnvelope,
  readStateSnapshot,
  resolveBubbleById,
  writeStateSnapshot
} from "../start/startCommandDependencyDefaults.js";

export const kickoffDefaults = {
  appendProtocolEnvelope,
  emitDeliveryNotificationAck: reviewerDeliveryDefaults.emitDeliveryNotificationAck,
  readStateSnapshot,
  resolveBubbleById,
  writeStateSnapshot
} as const;
