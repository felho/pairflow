import { BubbleLookupError } from "../../../core/bubble/bubbleLookup.js";
import { TmuxCommandError } from "../../../core/runtime/tmuxManager.js";
import {
  RuntimeSessionsRegistryError,
  RuntimeSessionsRegistryLockError
} from "../../../core/runtime/sessionsRegistry.js";
import { normalizeStopBubbleError } from "./stopCommandErrorNormalization.js";

export class StopBubbleError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "StopBubbleError";
  }
}

export function createStopBubbleError(message: string): StopBubbleError {
  return new StopBubbleError(message);
}

export function throwAsStopBubbleError(error: unknown): never {
  throw normalizeStopBubbleError({
    error,
    isStopBubbleError: (candidate) => candidate instanceof StopBubbleError,
    createStopBubbleError,
    isBubbleLookupError: (candidate): candidate is BubbleLookupError =>
      candidate instanceof BubbleLookupError,
    isTmuxCommandError: (candidate): candidate is TmuxCommandError =>
      candidate instanceof TmuxCommandError,
    isRuntimeSessionsRegistryError:
      (candidate): candidate is RuntimeSessionsRegistryError =>
        candidate instanceof RuntimeSessionsRegistryError,
    isRuntimeSessionsRegistryLockError:
      (candidate): candidate is RuntimeSessionsRegistryLockError =>
        candidate instanceof RuntimeSessionsRegistryLockError
  });
}
