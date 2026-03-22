import { throwAsNormalizedAskHumanCommandError } from "./askHumanCommandErrorBoundary.js";
import { createAskHumanCommandErrorCreator } from "./askHumanCommandErrorCreator.js";
import { normalizePairflowCommandErrorInput } from "../errors/commandErrorDetails.js";

export class AskHumanCommandError extends Error {
  public readonly reasonCode: string | undefined;
  public readonly context: PairflowCommandErrorContext | undefined;

  public constructor(input: PairflowCommandErrorInput) {
    const normalized = normalizePairflowCommandErrorInput(input);
    super(normalized.message, { cause: normalized.cause });
    this.name = "AskHumanCommandError";
    this.reasonCode = normalized.reasonCode;
    this.context = normalized.context;
  }
}

export const createAskHumanCommandError = createAskHumanCommandErrorCreator(
  (input) => new AskHumanCommandError(input)
);

export function throwAsAskHumanCommandError(error: unknown): never {
  // reason_code=ASK_HUMAN_COMMAND_ERROR_NORMALIZED context=command_error_boundary
  throwAsNormalizedAskHumanCommandError({
    error,
    isAskHumanCommandError: (candidate) => candidate instanceof AskHumanCommandError,
    createAskHumanCommandError
  });
}
