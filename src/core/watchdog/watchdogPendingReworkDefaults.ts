import { ensureBubbleInstanceIdForMutation } from "../../v11/infrastructure/artifact/bubble/bubbleInstanceId.js";
import { resolveDeliveryMessageRef } from "../../v11/infrastructure/channel/tmux/tmuxDelivery.js";

export const watchdogPendingReworkDefaults = {
  ensureBubbleInstanceIdForMutation,
  resolveDeliveryMessageRef
} as const;
