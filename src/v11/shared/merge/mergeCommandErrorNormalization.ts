export interface NormalizeBubbleMergeErrorInput {
  error: unknown;
  isBubbleMergeError: (candidate: unknown) => boolean;
  createBubbleMergeError: PairflowCreateCommandError;
  isBubbleLookupError?: (candidate: unknown) => boolean;
  isGitCommandError?: (candidate: unknown) => boolean;
  isWorkspaceCleanupError?: (candidate: unknown) => boolean;
  isTmuxCommandError?: (candidate: unknown) => boolean;
  isRuntimeSessionsRegistryError?: (candidate: unknown) => boolean;
  isRuntimeSessionsRegistryLockError?: (candidate: unknown) => boolean;
}

export function normalizeBubbleMergeError(
  input: NormalizeBubbleMergeErrorInput
): unknown {
  if (input.isBubbleMergeError(input.error)) {
    return input.error;
  }
  if (
    input.isBubbleLookupError?.(input.error) === true ||
    input.isGitCommandError?.(input.error) === true ||
    input.isWorkspaceCleanupError?.(input.error) === true ||
    input.isTmuxCommandError?.(input.error) === true ||
    input.isRuntimeSessionsRegistryError?.(input.error) === true ||
    input.isRuntimeSessionsRegistryLockError?.(input.error) === true
  ) {
    if (input.error instanceof Error) {
      return input.createBubbleMergeError(input.error.message);
    }
    return input.createBubbleMergeError(String(input.error));
  }
  if (input.error instanceof Error) {
    return input.createBubbleMergeError(input.error.message);
  }
  return input.error;
}
