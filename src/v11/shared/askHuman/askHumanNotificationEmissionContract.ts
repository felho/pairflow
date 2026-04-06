import type { emitBubbleNotification } from "../../infrastructure/channel/notifications.js";
import type { emitTmuxDeliveryNotification } from "../../infrastructure/channel/tmux/tmuxDelivery.js";
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
