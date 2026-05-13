export interface NormalizeStopBubbleErrorInput {
  error: unknown;
  isStopBubbleError: (candidate: unknown) => boolean;
  createStopBubbleError: PairflowCreateCommandError;
  isBubbleLookupError: (candidate: unknown) => boolean;
  isTmuxCommandError: (candidate: unknown) => boolean;
  isRuntimeSessionsRegistryError: (candidate: unknown) => boolean;
  isRuntimeSessionsRegistryLockError: (candidate: unknown) => boolean;
}

export function normalizeStopBubbleError(
  input: NormalizeStopBubbleErrorInput
): unknown {
  const message =
    input.error instanceof Error ? input.error.message : String(input.error);
  if (input.isStopBubbleError(input.error)) {
    return input.error;
  }
  if (
    input.isBubbleLookupError(input.error) ||
    input.isTmuxCommandError(input.error) ||
    input.isRuntimeSessionsRegistryError(input.error) ||
    input.isRuntimeSessionsRegistryLockError(input.error)
  ) {
    return input.createStopBubbleError(message);
  }
  if (input.error instanceof Error) {
    return input.createStopBubbleError(input.error.message);
  }
  return input.error;
}
