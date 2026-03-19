import type {
  AskHumanLifecycleMetricMetadataInput,
  BuildAskHumanFinalizationResultInput
} from "./askHumanFinalizationArtifactsContract.js";

export function buildAskHumanLifecycleMetricMetadata(
  input: AskHumanLifecycleMetricMetadataInput
) {
  return {
    sender: input.sender,
    refs_count: input.refs.length,
    question_length: Array.from(input.question).length
  };
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
