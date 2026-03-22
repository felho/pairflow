export interface NormalizeApprovalCommandErrorInput {
  error: unknown;
  isApprovalCommandError: (candidate: unknown) => boolean;
  createApprovalCommandError: PairflowCreateCommandError;
  isBubbleLookupError?: (candidate: unknown) => boolean;
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

  if (input.error instanceof Error) {
    return input.createApprovalCommandError(input.error.message);
  }

  return input.error;
}
