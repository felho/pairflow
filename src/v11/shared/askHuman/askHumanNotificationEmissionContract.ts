import type { BubbleConfig } from "../../../types/bubble.js";
import type { ProtocolEnvelope } from "../../../types/protocol.js";
import type {
  EmitAskHumanBubbleNotificationPort,
  EmitAskHumanTmuxDeliveryNotificationPort
} from "./askHumanDeliveryPortsContract.js";

export interface EmitOptionalAskHumanNotificationsInput {
  bubbleId: string;
  bubbleConfig: BubbleConfig;
  sessionsPath: string;
  envelope: ProtocolEnvelope;
  messageRef: string;
}

export interface EmitOptionalAskHumanNotificationsDependencies {
  emitTmuxDeliveryNotification: EmitAskHumanTmuxDeliveryNotificationPort;
  emitBubbleNotification: EmitAskHumanBubbleNotificationPort;
}
