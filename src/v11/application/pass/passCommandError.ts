import { normalizePassCommandError } from "./passCommandErrorNormalization.js";
import { normalizePairflowCommandErrorInput } from "../../shared/errors/commandErrorDetails.js";

export class PassCommandError extends Error {
  public readonly reasonCode: string | undefined;
  public readonly context: PairflowCommandErrorContext | undefined;

  public constructor(input: PairflowCommandErrorInput) {
    const normalized = normalizePairflowCommandErrorInput(input);
    super(normalized.message, { cause: normalized.cause });
    this.name = "PassCommandError";
    this.reasonCode = normalized.reasonCode;
    this.context = normalized.context;
  }
}

export function createPassCommandError(
  input: PairflowCommandErrorInput
): PassCommandError {
  return new PassCommandError(input);
}

export function throwAsPassCommandError(error: unknown): never {
  throw normalizePassCommandError({
    error,
    isPassCommandError: (candidate) => candidate instanceof PassCommandError,
    createPassCommandError
  });
}
