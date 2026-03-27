import { normalizePairflowCommandErrorInput } from "../errors/commandErrorDetails.js";

export class ConvergedCommandError extends Error {
  public readonly detailMessage: string;
  public readonly reasonCode: string | undefined;
  public readonly context: PairflowCommandErrorContext | undefined;

  public constructor(input: PairflowCommandErrorInput) {
    const normalized = normalizePairflowCommandErrorInput(input);
    super(normalized.message, { cause: normalized.cause });
    this.name = "ConvergedCommandError";
    this.detailMessage = typeof input === "string" ? normalized.message : input.message;
    this.reasonCode = normalized.reasonCode;
    this.context = normalized.context;
  }
}

export function createConvergedCommandError(
  input: PairflowCommandErrorInput
): ConvergedCommandError {
  return new ConvergedCommandError(input);
}

export function isConvergedCommandError(error: unknown): error is ConvergedCommandError {
  return error instanceof ConvergedCommandError;
}
