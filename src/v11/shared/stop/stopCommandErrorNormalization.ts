import type { BubbleLookupError } from "../../../core/bubble/bubbleLookup.js";
import type { TmuxCommandError } from "../../../core/runtime/tmuxManager.js";
import type {
  RuntimeSessionsRegistryError,
  RuntimeSessionsRegistryLockError
} from "../../../core/runtime/sessionsRegistry.js";

export interface NormalizeStopBubbleErrorInput {
  error: unknown;
  isStopBubbleError: (candidate: unknown) => boolean;
  createStopBubbleError: PairflowCreateCommandError;
  isBubbleLookupError: (candidate: unknown) => candidate is BubbleLookupError;
  isTmuxCommandError: (candidate: unknown) => candidate is TmuxCommandError;
  isRuntimeSessionsRegistryError:
    (candidate: unknown) => candidate is RuntimeSessionsRegistryError;
  isRuntimeSessionsRegistryLockError:
    (candidate: unknown) => candidate is RuntimeSessionsRegistryLockError;
}

export function normalizeStopBubbleError(
  input: NormalizeStopBubbleErrorInput
): unknown {
  if (input.isStopBubbleError(input.error)) {
    return input.error;
  }
  if (
    input.isBubbleLookupError(input.error) ||
    input.isTmuxCommandError(input.error) ||
    input.isRuntimeSessionsRegistryError(input.error) ||
    input.isRuntimeSessionsRegistryLockError(input.error)
  ) {
    return input.createStopBubbleError(input.error.message);
  }
  if (input.error instanceof Error) {
    return input.createStopBubbleError(input.error.message);
  }
  return input.error;
}
