import type { BubbleLookupError } from "../../infrastructure/executor/workspace/bubbleLookup.js";

export interface NormalizeBubbleWatchdogErrorInput {
  error: unknown;
  isBubbleWatchdogError: (candidate: unknown) => boolean;
  createBubbleWatchdogError: PairflowCreateCommandError;
  isBubbleLookupError: (candidate: unknown) => candidate is BubbleLookupError;
}

export function normalizeBubbleWatchdogError(
  input: NormalizeBubbleWatchdogErrorInput
): unknown {
  if (input.isBubbleWatchdogError(input.error)) {
    return input.error;
  }
  if (input.isBubbleLookupError(input.error)) {
    return input.createBubbleWatchdogError(input.error.message);
  }
  if (input.error instanceof Error) {
    return input.createBubbleWatchdogError(input.error.message);
  }
  return input.error;
}
