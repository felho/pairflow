import type { PersistedBubbleStateSnapshot } from "../../../../domain/state/snapshot/persistedBubbleStateSnapshot.js";
import type { ProtocolEnvelope } from "../../../../../types/protocol.js";
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
  state: PersistedBubbleStateSnapshot;
  activation?: AskHumanActivationProvenance;
  deliveryResult?: DeliveryAck;
}
