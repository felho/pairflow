import type { NormalizeAskHumanCommandErrorInput } from "./askHumanCommandErrorNormalizationContract.js";

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
