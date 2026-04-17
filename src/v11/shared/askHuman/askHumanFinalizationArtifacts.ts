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
    inferredRecipient: "human" as const,
    ...(input.activation !== undefined
      ? {
          activation: input.activation
        }
      : {}),
    ...(input.deliveryResult !== undefined
        ? {
          delivery: {
            status: input.deliveryResult.status,
            delivered: input.deliveryResult.delivered,
            ...(input.deliveryResult.message.length > 0
              ? { message: input.deliveryResult.message }
              : {}),
            ...(input.deliveryResult.reason !== undefined
              ? { reason: input.deliveryResult.reason }
              : {}),
            ...(input.deliveryResult.reason_code !== undefined
              ? { reason_code: input.deliveryResult.reason_code }
              : {}),
            ...(input.deliveryResult.deliveryTargetReasonCode !== undefined
              ? {
                  deliveryTargetReasonCode:
                    input.deliveryResult.deliveryTargetReasonCode
                }
              : {})
          }
        }
      : {})
  };
}
