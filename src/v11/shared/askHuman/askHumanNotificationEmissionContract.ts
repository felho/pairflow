import type { BubbleConfig } from "../../../types/bubble.js";
import type { ProtocolEnvelope } from "../../../types/protocol.js";
import type {
  EmitAskHumanBubbleNotificationPort,
  EmitAskHumanDeliveryNotificationAckPort
} from "./askHumanDeliveryPortsContract.js";

export interface EmitOptionalAskHumanNotificationsInput {
  bubbleId: string;
  bubbleConfig: BubbleConfig;
  sessionsPath: string;
  envelope: ProtocolEnvelope;
  messageRef: string;
}

export interface EmitOptionalAskHumanNotificationsDependencies {
  emitDeliveryNotificationAck: EmitAskHumanDeliveryNotificationAckPort;
  emitBubbleNotification: EmitAskHumanBubbleNotificationPort;
}
