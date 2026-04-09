import { ensureBubbleInstanceIdForMutation } from "./bubbleInstanceId.js";
import { resolveBubbleById } from "./bubbleLookup.js";
import { appendProtocolEnvelope } from "../protocol/transcriptStore.js";
import { readStateSnapshot, writeStateSnapshot } from "../state/stateStore.js";
import {
  emitTmuxDeliveryNotification,
  resolveDeliveryMessageRef
} from "../runtime/tmuxDelivery.js";

export const replyBubbleDependencyDefaults = {
  appendProtocolEnvelope,
  emitTmuxDeliveryNotification,
  ensureBubbleInstanceIdForMutation,
  readStateSnapshot,
  resolveBubbleById,
  resolveDeliveryMessageRef,
  writeStateSnapshot
} as const;
