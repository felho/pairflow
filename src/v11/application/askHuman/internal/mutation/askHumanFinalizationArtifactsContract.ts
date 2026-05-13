import type { BubbleStateSnapshot } from "../../../../domain/state/snapshot/bubbleStateSnapshot.js";
import type { ProtocolEnvelope } from "../../../../shared/protocol/protocolEnvelopeContract.js";
import type { AskHumanActivationProvenance } from "../../askHumanCommandContract.js";
import type { DeliveryAck } from "../../../../ports/tmuxDelivery.js";

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
  deliveryResult?: DeliveryAck;
}
