import { ensureBubbleInstanceIdForMutation } from "../../infrastructure/artifact/bubble/bubbleInstanceId.js";
import { resolveDeliveryMessageRef } from "../../infrastructure/channel/tmux/tmuxDelivery.js";

export const watchdogPendingReworkDefaults = {
  ensureBubbleInstanceIdForMutation,
  resolveDeliveryMessageRef
} as const;
