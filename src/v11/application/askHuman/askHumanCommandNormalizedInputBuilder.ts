import { normalizeAskHumanCommandInput } from "./askHumanCommandInputNormalization.js";
import type { BuildAskHumanCommandContextInput } from "./askHumanCommandContextContract.js";

export function buildNormalizedAskHumanCommandInput(
  commandInput: BuildAskHumanCommandContextInput["commandInput"]
) {
  return normalizeAskHumanCommandInput({
    question: commandInput.question,
    refs: commandInput.refs,
    cwd: commandInput.cwd,
    authoritativeContext: commandInput.authoritativeContext,
    now: commandInput.now
  });
}
