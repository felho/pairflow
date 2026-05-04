export interface NormalizeBubbleCommitErrorInput {
  error: unknown;
  isBubbleCommitError: (candidate: unknown) => boolean;
  createBubbleCommitError: PairflowCreateCommandError;
  isBubbleLookupError?: (candidate: unknown) => boolean;
  isGitCommandError?: (candidate: unknown) => boolean;
  isRemoteBubbleCommitCommandError?: (candidate: unknown) => boolean;
  isRemoteBubbleStatusError?: (candidate: unknown) => boolean;
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

  if (
    input.isRemoteBubbleStatusError?.(input.error) === true ||
    input.isRemoteBubbleCommitCommandError?.(input.error) === true
  ) {
    const remoteError = input.error as (Error & { code?: string | undefined });
    return input.createBubbleCommitError({
      message: remoteError.message,
      ...(remoteError.code !== undefined
        ? { reasonCode: remoteError.code }
        : {}),
      cause: input.error
    });
  }

  if (input.error instanceof Error) {
    return input.createBubbleCommitError(input.error.message);
  }

  return input.error;
}
