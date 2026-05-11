import { normalizeBubbleWatchdogError } from "./watchdogCommandErrorNormalization.js";
import {
  BubbleWatchdogError,
  createBubbleWatchdogError
} from "../../../../shared/watchdog/watchdogCommandError.js";
import { isNamedError } from "../../../../shared/errors/namedError.js";

export { BubbleWatchdogError, createBubbleWatchdogError };

export function throwAsBubbleWatchdogError(error: unknown): never {
  throw normalizeBubbleWatchdogError({
    error,
    isBubbleWatchdogError: (candidate) => candidate instanceof BubbleWatchdogError,
    createBubbleWatchdogError,
    isBubbleLookupError: (candidate) =>
      isNamedError(candidate, "BubbleLookupError")
  });
}
