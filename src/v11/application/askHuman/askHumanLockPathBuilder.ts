import { join } from "node:path";

import type { AskHumanExecutionArtifactsInput } from "./askHumanExecutionArtifactsContract.js";

export function buildAskHumanLockPath(input: AskHumanExecutionArtifactsInput): string {
  return join(
    input.routing.resolved.bubblePaths.locksDir,
    `${input.routing.resolved.bubbleId}.lock`
  );
}
