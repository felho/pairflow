export interface NormalizeStartBubbleErrorInput {
  error: unknown;
  isStartBubbleError: (candidate: unknown) => boolean;
  createStartBubbleError: PairflowCreateCommandError;
  isBubbleLookupError: (candidate: unknown) => boolean;
  isWorkspaceBootstrapError: (candidate: unknown) => boolean;
  isTmuxCommandError: (candidate: unknown) => boolean;
  isTmuxSessionExistsError: (candidate: unknown) => boolean;
  isRuntimeSessionsRegistryError: (candidate: unknown) => boolean;
  isRuntimeSessionsRegistryLockError: (candidate: unknown) => boolean;
}

export function normalizeStartBubbleError(
  input: NormalizeStartBubbleErrorInput
): unknown {
  const message =
    input.error instanceof Error ? input.error.message : String(input.error);
  if (input.isStartBubbleError(input.error)) {
    return input.error;
  }
  if (input.isBubbleLookupError(input.error)) {
    return input.createStartBubbleError(message);
  }
  if (input.isWorkspaceBootstrapError(input.error)) {
    return input.createStartBubbleError(message);
  }
  if (
    input.isTmuxCommandError(input.error)
    || input.isTmuxSessionExistsError(input.error)
  ) {
    return input.createStartBubbleError(message);
  }
  if (
    input.isRuntimeSessionsRegistryError(input.error)
    || input.isRuntimeSessionsRegistryLockError(input.error)
  ) {
    return input.createStartBubbleError(message);
  }
  if (input.error instanceof Error) {
    return input.createStartBubbleError(input.error.message);
  }
  return input.error;
}
