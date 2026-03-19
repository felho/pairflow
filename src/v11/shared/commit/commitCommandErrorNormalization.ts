export interface NormalizeBubbleCommitErrorInput {
  error: unknown;
  isBubbleCommitError: (candidate: unknown) => boolean;
  createBubbleCommitError: (message: string) => Error;
  isBubbleLookupError?: (candidate: unknown) => boolean;
  isGitCommandError?: (candidate: unknown) => boolean;
}

export function normalizeBubbleCommitError(
  input: NormalizeBubbleCommitErrorInput
): unknown {
  if (input.isBubbleCommitError(input.error)) {
    return input.error;
  }

  if (
    input.isBubbleLookupError?.(input.error) === true ||
    input.isGitCommandError?.(input.error) === true
  ) {
    const message =
      input.error instanceof Error
        ? input.error.message
        : String(input.error);
    return input.createBubbleCommitError(message);
  }

  if (input.error instanceof Error) {
    return input.createBubbleCommitError(input.error.message);
  }

  return input.error;
}
