import { join } from "node:path";

import type { AskHumanExecutionArtifactsInput } from "./askHumanExecutionArtifactsContract.js";
export { buildAskHumanEnvelope } from "./askHumanEnvelopeBuilder.js";
export { buildAskHumanStateWriteFailureMessage } from "./askHumanExecutionFailureMessageBuilder.js";

export function buildAskHumanLockPath(input: AskHumanExecutionArtifactsInput): string {
  return join(
    input.routing.resolved.bubblePaths.locksDir,
    `${input.routing.resolved.bubbleId}.lock`
  );
}
