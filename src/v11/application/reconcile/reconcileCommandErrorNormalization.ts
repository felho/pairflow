export interface NormalizeStartupReconcilerErrorInput {
  error: unknown;
  isStartupReconcilerError: (candidate: unknown) => boolean;
  createStartupReconcilerError: PairflowCreateCommandError;
  isError: (candidate: unknown) => candidate is Error;
}

export function normalizeStartupReconcilerError(
  input: NormalizeStartupReconcilerErrorInput
): unknown {
  if (input.isStartupReconcilerError(input.error)) {
    return input.error;
  }
  if (input.isError(input.error)) {
    return input.createStartupReconcilerError(input.error.message);
  }
  return input.error;
}
