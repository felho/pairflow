import { BubbleLookupError } from "../../../core/bubble/bubbleLookup.js";
import {
  RuntimeSessionsRegistryError,
  RuntimeSessionsRegistryLockError
} from "../../infrastructure/executor/sessionRuntime/runtimeSessionsRegistry.js";
import { TmuxCommandError } from "../../../core/runtime/tmuxManager.js";
import {
  asStartBubbleError,
  StartBubbleError
} from "../../../core/bubble/startBubble.js";
import { normalizeRestartBubbleError } from "./restartCommandErrorNormalization.js";
import {
  normalizePairflowCommandErrorInput,
  withRequiredCommandContext
} from "../errors/commandErrorDetails.js";

export class RestartBubbleError extends Error {
  public readonly reasonCode: string | undefined;
  public readonly context: PairflowCommandErrorContext | undefined;

  public constructor(input: PairflowCommandErrorInput) {
    const normalized = normalizePairflowCommandErrorInput(input);
    super(normalized.message, { cause: normalized.cause });
    this.name = "RestartBubbleError";
    this.reasonCode = normalized.reasonCode;
    this.context = withRequiredCommandContext(normalized.context, "restart");
  }
}

export function createRestartBubbleError(
  input: PairflowCommandErrorInput
): RestartBubbleError {
  return new RestartBubbleError(input);
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
