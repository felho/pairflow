import { requireNonEmptyString } from "../../../../shared/normalization/stringNormalization.js";
import type { RestartBubbleInput } from "../../restartCommandContract.js";

export interface NormalizedRestartBubbleInput {
  bubbleId: string;
  repoPath?: string;
  cwd?: string;
  now?: Date;
}

export function normalizeRestartBubbleInput(
  input: RestartBubbleInput,
  createError: PairflowCreateCommandError
): NormalizedRestartBubbleInput {
  return {
    bubbleId: requireNonEmptyString(input.bubbleId, "Bubble id", createError),
    ...(input.repoPath !== undefined ? { repoPath: input.repoPath } : {}),
    ...(input.cwd !== undefined ? { cwd: input.cwd } : {}),
    ...(input.now !== undefined ? { now: input.now } : {})
  };
}
