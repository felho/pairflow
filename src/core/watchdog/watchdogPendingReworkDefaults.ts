import { ensureBubbleInstanceIdForMutation } from "../bubble/bubbleInstanceId.js";
import { resolveDeliveryMessageRef } from "../runtime/tmuxDelivery.js";

export const watchdogPendingReworkDefaults = {
  ensureBubbleInstanceIdForMutation,
  resolveDeliveryMessageRef
} as const;
