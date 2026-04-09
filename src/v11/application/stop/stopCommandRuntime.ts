import {
  normalizePairflowCommandErrorInput,
  withRequiredCommandContext
} from "../../shared/errors/commandErrorDetails.js";
import { isNamedError } from "../../shared/errors/namedError.js";
import { normalizeStopBubbleError } from "./stopCommandErrorNormalization.js";

export class StopBubbleError extends Error {
  public readonly reasonCode: string | undefined;
  public readonly context: PairflowCommandErrorContext | undefined;

  public constructor(input: PairflowCommandErrorInput) {
    const normalized = normalizePairflowCommandErrorInput(input);
    super(normalized.message, { cause: normalized.cause });
    this.name = "StopBubbleError";
    this.reasonCode = normalized.reasonCode;
    this.context = withRequiredCommandContext(normalized.context, "stop");
  }
}

export function createStopBubbleError(
  input: PairflowCommandErrorInput
): StopBubbleError {
  return new StopBubbleError(input);
}

export function throwAsStopBubbleError(error: unknown): never {
  throw normalizeStopBubbleError({
    error,
    isStopBubbleError: (candidate) => candidate instanceof StopBubbleError,
    createStopBubbleError,
    isBubbleLookupError: (candidate) =>
      isNamedError(candidate, "BubbleLookupError"),
    isTmuxCommandError: (candidate) =>
      isNamedError(candidate, "TmuxCommandError"),
    isRuntimeSessionsRegistryError: (candidate) =>
      isNamedError(candidate, "RuntimeSessionsRegistryError"),
    isRuntimeSessionsRegistryLockError: (candidate) =>
      isNamedError(candidate, "RuntimeSessionsRegistryLockError")
  });
}
