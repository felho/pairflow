import type { StartBubbleErrorV11 as StartBubbleError } from "../start/emitStartV11.js";

export interface NormalizeRestartBubbleErrorInput {
  error: unknown;
  isRestartBubbleError: (candidate: unknown) => boolean;
  createRestartBubbleError: PairflowCreateCommandError;
  isBubbleLookupError: (candidate: unknown) => boolean;
  isTmuxCommandError: (candidate: unknown) => boolean;
  isRuntimeSessionsRegistryError: (candidate: unknown) => boolean;
  isRuntimeSessionsRegistryLockError: (candidate: unknown) => boolean;
  isStartBubbleError: (candidate: unknown) => boolean;
  asStartBubbleError: (error: unknown) => never;
}

export function normalizeRestartBubbleError(
  input: NormalizeRestartBubbleErrorInput
): unknown {
  const message =
    input.error instanceof Error ? input.error.message : String(input.error);
  if (input.isRestartBubbleError(input.error)) {
    return input.error;
  }
  if (input.isBubbleLookupError(input.error)) {
    return input.createRestartBubbleError(message);
  }
  if (input.isTmuxCommandError(input.error)) {
    return input.createRestartBubbleError(message);
  }
  if (
    input.isRuntimeSessionsRegistryError(input.error) ||
    input.isRuntimeSessionsRegistryLockError(input.error)
  ) {
    return input.createRestartBubbleError(message);
  }
  if (input.isStartBubbleError(input.error)) {
    return input.createRestartBubbleError(message);
  }
  try {
    input.asStartBubbleError(input.error);
  } catch (startError) {
    if (startError instanceof Error) {
      return input.createRestartBubbleError(startError.message);
    }
    return startError;
  }
  return input.error;
}
