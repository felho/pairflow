import { normalizeStartBubbleError } from "./startCommandErrorNormalization.js";
import {
  normalizePairflowCommandErrorInput,
  withRequiredCommandContext
} from "../../shared/errors/commandErrorDetails.js";
import { isNamedError } from "../../shared/errors/namedError.js";

export class StartBubbleError extends Error {
  public readonly reasonCode: string | undefined;
  public readonly context: PairflowCommandErrorContext | undefined;

  public constructor(input: PairflowCommandErrorInput) {
    const normalized = normalizePairflowCommandErrorInput(input);
    super(normalized.message, { cause: normalized.cause });
    this.name = "StartBubbleError";
    this.reasonCode = normalized.reasonCode;
    this.context = withRequiredCommandContext(normalized.context, "start");
  }
}

export function createStartBubbleError(
  input: PairflowCommandErrorInput
): StartBubbleError {
  return new StartBubbleError(input);
}

export function throwAsStartBubbleError(error: unknown): never {
  throw normalizeStartBubbleError({
    error,
    isStartBubbleError: (candidate) => candidate instanceof StartBubbleError,
    createStartBubbleError,
    isBubbleLookupError: (candidate) =>
      isNamedError(candidate, "BubbleLookupError"),
    isWorkspaceBootstrapError: (candidate) =>
      isNamedError(candidate, "WorkspaceBootstrapError"),
    isTmuxCommandError: (candidate) =>
      isNamedError(candidate, "TmuxCommandError"),
    isTmuxSessionExistsError: (candidate) =>
      isNamedError(candidate, "TmuxSessionExistsError"),
    isRuntimeSessionsRegistryError: (candidate) =>
      isNamedError(candidate, "RuntimeSessionsRegistryError"),
    isRuntimeSessionsRegistryLockError: (candidate) =>
      isNamedError(candidate, "RuntimeSessionsRegistryLockError")
  });
}
