export interface NormalizeReplyCommandErrorInput {
  error: unknown;
  isReplyCommandError: (candidate: unknown) => boolean;
  isBubbleLookupError: (candidate: unknown) => boolean;
  createReplyCommandError: PairflowCreateCommandError;
}

export function normalizeReplyCommandError(
  input: NormalizeReplyCommandErrorInput
): unknown {
  if (input.isReplyCommandError(input.error)) {
    return input.error;
  }

  if (input.isBubbleLookupError(input.error)) {
    if (input.error instanceof Error) {
      return input.createReplyCommandError(input.error.message);
    }
    return input.createReplyCommandError(String(input.error));
  }

  if (input.error instanceof Error) {
    return input.createReplyCommandError(input.error.message);
  }

  return input.error;
}
