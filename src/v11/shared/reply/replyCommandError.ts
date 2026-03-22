import { BubbleLookupError } from "../../../core/bubble/bubbleLookup.js";
import { normalizeReplyCommandError } from "./replyCommandErrorNormalization.js";
import { normalizePairflowCommandErrorInput } from "../errors/commandErrorDetails.js";

export class HumanReplyCommandError extends Error {
  public readonly reasonCode: string | undefined;
  public readonly context: PairflowCommandErrorContext | undefined;

  public constructor(input: PairflowCommandErrorInput) {
    const normalized = normalizePairflowCommandErrorInput(input);
    super(normalized.message, { cause: normalized.cause });
    this.name = "HumanReplyCommandError";
    this.reasonCode = normalized.reasonCode;
    this.context = normalized.context;
  }
}

export function createHumanReplyCommandError(
  input: PairflowCommandErrorInput
): HumanReplyCommandError {
  return new HumanReplyCommandError(input);
}

export function throwAsHumanReplyCommandError(error: unknown): never {
  throw normalizeReplyCommandError({
    error,
    isReplyCommandError: (candidate) => candidate instanceof HumanReplyCommandError,
    isBubbleLookupError: (candidate) => candidate instanceof BubbleLookupError,
    createReplyCommandError: createHumanReplyCommandError
  });
}
