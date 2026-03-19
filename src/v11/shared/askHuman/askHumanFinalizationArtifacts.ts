import type { BubbleStateSnapshot } from "../../../types/bubble.js";
import type { ProtocolEnvelope } from "../../../types/protocol.js";

export interface AskHumanLifecycleMetricMetadataInput {
  sender: string;
  refs: string[];
  question: string;
}

export function buildAskHumanLifecycleMetricMetadata(
  input: AskHumanLifecycleMetricMetadataInput
) {
  return {
    sender: input.sender,
    refs_count: input.refs.length,
    question_length: Array.from(input.question).length
  };
}

export interface BuildAskHumanFinalizationResultInput {
  bubbleId: string;
  sequence: number;
  envelope: ProtocolEnvelope;
  state: BubbleStateSnapshot;
}

export function buildAskHumanFinalizationResult(
  input: BuildAskHumanFinalizationResultInput
) {
  return {
    bubbleId: input.bubbleId,
    sequence: input.sequence,
    envelope: input.envelope,
    state: input.state,
    inferredRecipient: "human" as const
  };
}
