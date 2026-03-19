import { BubbleLookupError } from "../../../core/bubble/bubbleLookup.js";
import { normalizeReplyCommandError } from "./replyCommandErrorNormalization.js";

export class HumanReplyCommandError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "HumanReplyCommandError";
  }
}

export function createHumanReplyCommandError(message: string): HumanReplyCommandError {
  return new HumanReplyCommandError(message);
}

export function throwAsHumanReplyCommandError(error: unknown): never {
  throw normalizeReplyCommandError({
    error,
    isReplyCommandError: (candidate) => candidate instanceof HumanReplyCommandError,
    isBubbleLookupError: (candidate) => candidate instanceof BubbleLookupError,
    createReplyCommandError: createHumanReplyCommandError
  });
}
