import type { AskHumanExecutionArtifactsInput } from "./askHumanExecutionArtifactsContract.js";

export function buildAskHumanEnvelope(input: AskHumanExecutionArtifactsInput) {
  return {
    bubble_id: input.routing.resolved.bubbleId,
    sender: input.routing.state.active_agent,
    recipient: "human" as const,
    type: "HUMAN_QUESTION" as const,
    round: input.routing.state.round,
    payload: {
      question: input.routing.question
    },
    refs: input.routing.refs
  };
}
