import type {
  NormalizedAskHumanCommandInput,
  NormalizeAskHumanCommandInputInput
} from "./askHumanCommandInputNormalizationContract.js";

export function normalizeAskHumanCommandInput(
  input: NormalizeAskHumanCommandInputInput
): NormalizedAskHumanCommandInput {
  return {
    question: input.question,
    ...(input.refs !== undefined
      ? { refs: input.refs }
      : {}),
    ...(input.cwd !== undefined
      ? { cwd: input.cwd }
      : {}),
    now: input.now ?? new Date()
  };
}
