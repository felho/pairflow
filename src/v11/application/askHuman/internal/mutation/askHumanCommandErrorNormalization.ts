export interface NormalizeAskHumanCommandErrorInput {
  error: unknown;
  isAskHumanCommandError: (candidate: unknown) => boolean;
  createAskHumanCommandError: PairflowCreateCommandError;
}

export function normalizeAskHumanCommandError(
  input: NormalizeAskHumanCommandErrorInput
): unknown {
  if (input.isAskHumanCommandError(input.error)) {
    return input.error;
  }

  if (input.error instanceof Error) {
    return input.createAskHumanCommandError(input.error.message);
  }

  return input.error;
}
