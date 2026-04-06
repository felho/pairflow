import { BubbleLookupError } from "../../infrastructure/executor/workspace/bubbleLookup.js";
import { TmuxCommandError } from "../../../core/runtime/tmuxManager.js";
import {
  RuntimeSessionsRegistryError,
  RuntimeSessionsRegistryLockError
} from "../../infrastructure/executor/sessionRuntime/runtimeSessionsRegistry.js";
import { normalizeStopBubbleError } from "./stopCommandErrorNormalization.js";
import {
  normalizePairflowCommandErrorInput,
  withRequiredCommandContext
} from "../errors/commandErrorDetails.js";

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
