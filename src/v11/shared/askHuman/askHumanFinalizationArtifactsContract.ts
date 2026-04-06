import type { BubbleStateSnapshot } from "../../../types/bubble.js";
import type { ProtocolEnvelope } from "../../../types/protocol.js";
import type { EmitTmuxDeliveryNotificationResult } from "../../infrastructure/channel/tmux/tmuxDelivery.js";

export interface AskHumanLifecycleMetricMetadataInput {
  sender: string;
  refs: string[];
  question: string;
}

export interface BuildAskHumanFinalizationResultInput {
  bubbleId: string;
  sequence: number;
  envelope: ProtocolEnvelope;
  state: BubbleStateSnapshot;
  deliveryResult?: EmitTmuxDeliveryNotificationResult;
}
