import { join } from "node:path";

import type { AppendProtocolEnvelopeResult } from "../../../core/protocol/transcriptStore.js";
import type { AskHumanRoutingContext } from "./askHumanRoutingContext.js";

export interface AskHumanExecutionArtifactsInput {
  routing: AskHumanRoutingContext;
}

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

export function buildAskHumanStateWriteFailureMessage(
  appendResult: AppendProtocolEnvelopeResult,
  error: unknown
): string {
  const reason = error instanceof Error ? error.message : String(error);
  return `HUMAN_QUESTION ${appendResult.envelope.id} was appended but state update failed. Transcript remains canonical; recover state from transcript tail. Root error: ${reason}`;
}
