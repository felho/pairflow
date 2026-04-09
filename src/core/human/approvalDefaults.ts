import { appendProtocolEnvelope, readTranscriptEnvelopes } from "../protocol/transcriptStore.js";
import { ensureBubbleInstanceIdForMutation } from "../bubble/bubbleInstanceId.js";
import { resolveBubbleById } from "../bubble/bubbleLookup.js";
import { readStateSnapshot, writeStateSnapshot } from "../state/stateStore.js";
import {
  emitTmuxDeliveryNotification,
  resolveDeliveryMessageRef
} from "../runtime/tmuxDelivery.js";
import type { ApprovalCommandDefaultDependencies } from "../../v11/application/approval/approvalCommandDependencyResolution.js";

export const approvalDependencyDefaults: ApprovalCommandDefaultDependencies = {
  appendProtocolEnvelope,
  emitTmuxDeliveryNotification,
  ensureBubbleInstanceIdForMutation,
  readStateSnapshot,
  readTranscriptEnvelopes,
  resolveBubbleById,
  resolveDeliveryMessageRef,
  writeStateSnapshot
} as const;
