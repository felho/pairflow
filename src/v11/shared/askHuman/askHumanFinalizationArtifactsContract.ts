import type { BubbleStateSnapshot } from "../../../types/bubble.js";
import type { ProtocolEnvelope } from "../../../types/protocol.js";
import type { AskHumanDeliveryAck } from "./askHumanDeliveryPortsContract.js";
import type { AskHumanActivationProvenance } from "./askHumanCommandContract.js";

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
  activation?: AskHumanActivationProvenance;
  deliveryResult?: AskHumanDeliveryAck;
}
