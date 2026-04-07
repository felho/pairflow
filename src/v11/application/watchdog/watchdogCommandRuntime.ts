import { BubbleLookupError } from "../../../core/bubble/bubbleLookup.js";
import { normalizeBubbleWatchdogError } from "./watchdogCommandErrorNormalization.js";
import {
  BubbleWatchdogError,
  createBubbleWatchdogError
} from "../../shared/watchdog/watchdogCommandError.js";

export { BubbleWatchdogError, createBubbleWatchdogError };

export function throwAsBubbleWatchdogError(error: unknown): never {
  throw normalizeBubbleWatchdogError({
    error,
    isBubbleWatchdogError: (candidate) => candidate instanceof BubbleWatchdogError,
    createBubbleWatchdogError,
    isBubbleLookupError: (candidate): candidate is BubbleLookupError =>
      candidate instanceof BubbleLookupError
  });
}
