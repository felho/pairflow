export interface NormalizeBubbleWatchdogErrorInput {
  error: unknown;
  isBubbleWatchdogError: (candidate: unknown) => boolean;
  createBubbleWatchdogError: PairflowCreateCommandError;
  isBubbleLookupError: (candidate: unknown) => boolean;
}

export function normalizeBubbleWatchdogError(
  input: NormalizeBubbleWatchdogErrorInput
): unknown {
  const message =
    input.error instanceof Error ? input.error.message : String(input.error);
  if (input.isBubbleWatchdogError(input.error)) {
    return input.error;
  }
  if (input.isBubbleLookupError(input.error)) {
    return input.createBubbleWatchdogError(message);
  }
  if (input.error instanceof Error) {
    return input.createBubbleWatchdogError(input.error.message);
  }
  return input.error;
}
