import { BubbleLookupError } from "../../../core/bubble/bubbleLookup.js";
import {
  RuntimeSessionsRegistryError,
  RuntimeSessionsRegistryLockError
} from "../../../core/runtime/sessionsRegistry.js";
import { TmuxCommandError } from "../../../core/runtime/tmuxManager.js";
import {
  asStartBubbleError,
  StartBubbleError
} from "../../../core/bubble/startBubble.js";
import { normalizeRestartBubbleError } from "./restartCommandErrorNormalization.js";

export class RestartBubbleError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "RestartBubbleError";
  }
}

export function createRestartBubbleError(message: string): RestartBubbleError {
  return new RestartBubbleError(message);
}

export function throwAsRestartBubbleError(error: unknown): never {
  throw normalizeRestartBubbleError({
    error,
    isRestartBubbleError: (candidate) => candidate instanceof RestartBubbleError,
    createRestartBubbleError,
    isBubbleLookupError: (candidate): candidate is BubbleLookupError =>
      candidate instanceof BubbleLookupError,
    isTmuxCommandError: (candidate): candidate is TmuxCommandError =>
      candidate instanceof TmuxCommandError,
    isRuntimeSessionsRegistryError:
      (candidate): candidate is RuntimeSessionsRegistryError =>
        candidate instanceof RuntimeSessionsRegistryError,
    isRuntimeSessionsRegistryLockError:
      (candidate): candidate is RuntimeSessionsRegistryLockError =>
        candidate instanceof RuntimeSessionsRegistryLockError,
    isStartBubbleError: (candidate): candidate is StartBubbleError =>
      candidate instanceof StartBubbleError,
    asStartBubbleError
  });
}
