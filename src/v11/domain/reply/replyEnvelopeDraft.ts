import type { AgentName, AgentRole } from "../../../types/bubble.js";
import { deliveryTargetRoleMetadataKey } from "../../../types/protocol.js";
import type { ProtocolEnvelopeDraft } from "../../shared/ports/transcript.js";

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
): ProtocolEnvelopeDraft {
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
