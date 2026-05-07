export interface NormalizeApprovalCommandErrorInput {
  error: unknown;
  isApprovalCommandError: (candidate: unknown) => boolean;
  createApprovalCommandError: PairflowCreateCommandError;
  isBubbleLookupError?: (candidate: unknown) => boolean;
  isRemoteBubbleApprovalCommandError?: (candidate: unknown) => boolean;
  isRemoteBubbleStatusError?: (candidate: unknown) => boolean;
}

export function normalizeApprovalCommandError(
  input: NormalizeApprovalCommandErrorInput
): unknown {
  if (input.isApprovalCommandError(input.error)) {
    return input.error;
  }

  if (input.isBubbleLookupError?.(input.error) === true) {
    const message =
      input.error instanceof Error
        ? input.error.message
        : String(input.error);
    return input.createApprovalCommandError(message);
  }

  if (input.isRemoteBubbleStatusError?.(input.error) === true) {
    const remoteStatusError =
      input.error as (Error & { code?: string | undefined });
    return input.createApprovalCommandError({
      message: remoteStatusError.message,
      ...(remoteStatusError.code !== undefined
        ? { reasonCode: remoteStatusError.code }
        : {}),
      cause: input.error
    });
  }

  if (input.isRemoteBubbleApprovalCommandError?.(input.error) === true) {
    const remoteApprovalError =
      input.error as (Error & { code?: string | undefined });
    return input.createApprovalCommandError({
      message: remoteApprovalError.message,
      ...(remoteApprovalError.code !== undefined
        ? { reasonCode: remoteApprovalError.code }
        : {}),
      cause: input.error
    });
  }

  if (input.error instanceof Error) {
    return input.createApprovalCommandError(input.error.message);
  }

  return input.error;
}
