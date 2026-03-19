import { buildAskHumanCommandErrorFactory } from "./askHumanCommandErrorFactory.js";
import { throwAsNormalizedAskHumanCommandError } from "./askHumanCommandErrorBoundary.js";

export class AskHumanCommandError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "AskHumanCommandError";
  }
}

export const createAskHumanCommandError = buildAskHumanCommandErrorFactory({
  createAskHumanCommandError: (message) => new AskHumanCommandError(message)
});

export function throwAsAskHumanCommandError(error: unknown): never {
  // reason_code=ASK_HUMAN_COMMAND_ERROR_NORMALIZED context=command_error_boundary
  throwAsNormalizedAskHumanCommandError({
    error,
    isAskHumanCommandError: (candidate) => candidate instanceof AskHumanCommandError,
    createAskHumanCommandError
  });
}
