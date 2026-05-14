import type {
  AgentName,
  AgentRole
} from "../../../contracts/kernel/agentIdentity.js";
import {
  type ProtocolEnvelopeDraft
} from "../../shared/protocol/protocolEnvelopeContract.js";
import {
  deliveryTargetRoleMetadataKey
} from "../../shared/delivery/deliveryTargetMetadataContract.js";

export interface BuildHumanReplyEnvelopeDraftInput {
  bubbleId: string;
  recipient: AgentName;
  recipientRole: AgentRole;
  round: number;
  message: string;
  refs: string[];
}

export function buildHumanReplyEnvelopeDraft(
  input: BuildHumanReplyEnvelopeDraftInput
): ProtocolEnvelopeDraft<"HUMAN_REPLY"> {
  return {
    bubble_id: input.bubbleId,
    sender: "human",
    recipient: input.recipient,
    type: "HUMAN_REPLY",
    round: input.round,
    payload: {
      message: input.message,
      metadata: {
        [deliveryTargetRoleMetadataKey]: input.recipientRole
      }
    },
    refs: input.refs
  };
}
