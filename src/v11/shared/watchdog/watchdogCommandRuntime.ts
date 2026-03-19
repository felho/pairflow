import { BubbleLookupError } from "../../../core/bubble/bubbleLookup.js";
import { normalizeBubbleWatchdogError } from "./watchdogCommandErrorNormalization.js";

export class BubbleWatchdogError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "BubbleWatchdogError";
  }
}

export function createBubbleWatchdogError(message: string): BubbleWatchdogError {
  return new BubbleWatchdogError(message);
}

export function throwAsBubbleWatchdogError(error: unknown): never {
  throw normalizeBubbleWatchdogError({
    error,
    isBubbleWatchdogError: (candidate) => candidate instanceof BubbleWatchdogError,
    createBubbleWatchdogError,
    isBubbleLookupError: (candidate): candidate is BubbleLookupError =>
      candidate instanceof BubbleLookupError
  });
}
