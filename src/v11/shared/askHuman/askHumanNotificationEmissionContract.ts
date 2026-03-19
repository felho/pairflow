import type { emitBubbleNotification } from "../../../core/runtime/notifications.js";
import type { emitTmuxDeliveryNotification } from "../../../core/runtime/tmuxDelivery.js";
import type { ProtocolEnvelope } from "../../../types/protocol.js";

export interface EmitOptionalAskHumanNotificationsInput {
  bubbleId: string;
  bubbleConfig: Parameters<typeof emitBubbleNotification>[0];
  sessionsPath: string;
  envelope: ProtocolEnvelope;
  messageRef: string;
}

export interface EmitOptionalAskHumanNotificationsDependencies {
  emitTmuxDeliveryNotification: typeof emitTmuxDeliveryNotification;
  emitBubbleNotification: typeof emitBubbleNotification;
}
