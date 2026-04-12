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

const startupIncompleteOutcome =
  "This bubble is not resumable with `pairflow bubble start` and must not be treated as running.";

export function createStartBubbleError(
  input: PairflowCommandErrorInput
): StartBubbleError {
  return new StartBubbleError(input);
}

export function buildPreparingWorkspaceStartRejectMessage(): string {
  return [
    "bubble start rejected: state PREPARING_WORKSPACE indicates an incomplete startup.",
    startupIncompleteOutcome,
    "Delete this incomplete bubble with `pairflow bubble delete --id <id> --force`, then create a new bubble."
  ].join(" ");
}

export function buildCloneWorkspaceModeStartRejectMessage(): string {
  return [
    "bubble start rejected: work_mode=clone is not activated in this phase.",
    "Successful clone-topology start and resume are disabled until the producer/consumer activation tasks land.",
    "The bubble state remains unchanged."
  ].join(" ");
}

export function buildStartupIncompleteStartFailureMessage(
  bubbleId: string,
  causeMessage: string
): string {
  return [
    `Bubble ${bubbleId} startup did not complete.`,
    startupIncompleteOutcome,
    `Delete this incomplete bubble with \`pairflow bubble delete --id ${bubbleId} --force\`, then create a new bubble.`,
    `Cause: ${causeMessage}`
  ].join(" ");
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
