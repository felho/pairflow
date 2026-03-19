import { join } from "node:path";

import type { AskHumanExecutionArtifactsInput } from "./askHumanExecutionArtifactsContract.js";
export { buildAskHumanStateWriteFailureMessage } from "./askHumanExecutionFailureMessageBuilder.js";

export function buildAskHumanLockPath(input: AskHumanExecutionArtifactsInput): string {
  return join(
    input.routing.resolved.bubblePaths.locksDir,
    `${input.routing.resolved.bubbleId}.lock`
  );
}

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
