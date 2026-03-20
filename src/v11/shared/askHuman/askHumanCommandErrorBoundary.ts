import { normalizeAskHumanCommandError } from "./askHumanCommandErrorNormalization.js";
import type { NormalizeAskHumanCommandErrorInput } from "./askHumanCommandErrorNormalizationContract.js";

export function throwAsNormalizedAskHumanCommandError(
  input: NormalizeAskHumanCommandErrorInput
): never {
  throw normalizeAskHumanCommandError({
    error: input.error,
    isAskHumanCommandError: input.isAskHumanCommandError,
    createAskHumanCommandError: input.createAskHumanCommandError
  });
}
