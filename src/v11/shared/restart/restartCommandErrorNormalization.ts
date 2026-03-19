import type { BubbleLookupError } from "../../../core/bubble/bubbleLookup.js";
import type {
  RuntimeSessionsRegistryError,
  RuntimeSessionsRegistryLockError
} from "../../../core/runtime/sessionsRegistry.js";
import type { TmuxCommandError } from "../../../core/runtime/tmuxManager.js";
import type { StartBubbleError } from "../../../core/bubble/startBubble.js";

export interface NormalizeRestartBubbleErrorInput {
  error: unknown;
  isRestartBubbleError: (candidate: unknown) => boolean;
  createRestartBubbleError: (message: string) => Error;
  isBubbleLookupError: (candidate: unknown) => candidate is BubbleLookupError;
  isTmuxCommandError: (candidate: unknown) => candidate is TmuxCommandError;
  isRuntimeSessionsRegistryError:
    (candidate: unknown) => candidate is RuntimeSessionsRegistryError;
  isRuntimeSessionsRegistryLockError:
    (candidate: unknown) => candidate is RuntimeSessionsRegistryLockError;
  isStartBubbleError: (candidate: unknown) => candidate is StartBubbleError;
  asStartBubbleError: (error: unknown) => never;
}

export function normalizeRestartBubbleError(
  input: NormalizeRestartBubbleErrorInput
): unknown {
  if (input.isRestartBubbleError(input.error)) {
    return input.error;
  }
  if (input.isBubbleLookupError(input.error)) {
    return input.createRestartBubbleError(input.error.message);
  }
  if (input.isTmuxCommandError(input.error)) {
    return input.createRestartBubbleError(input.error.message);
  }
  if (
    input.isRuntimeSessionsRegistryError(input.error) ||
    input.isRuntimeSessionsRegistryLockError(input.error)
  ) {
    return input.createRestartBubbleError(input.error.message);
  }
  if (input.isStartBubbleError(input.error)) {
    return input.createRestartBubbleError(input.error.message);
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
