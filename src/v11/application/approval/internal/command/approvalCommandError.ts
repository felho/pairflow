import { normalizePairflowCommandErrorInput } from "../../../../shared/errors/commandErrorDetails.js";

export class ApprovalCommandError extends Error {
  public readonly reasonCode: string | undefined;
  public readonly context: PairflowCommandErrorContext | undefined;

  public constructor(input: PairflowCommandErrorInput) {
    const normalized = normalizePairflowCommandErrorInput(input);
    super(normalized.message, { cause: normalized.cause });
    this.name = "ApprovalCommandError";
    this.reasonCode = normalized.reasonCode;
    this.context = normalized.context;
  }
}

export function createApprovalCommandError(
  input: PairflowCommandErrorInput
): ApprovalCommandError {
  return new ApprovalCommandError(input);
}

export function isApprovalCommandError(candidate: unknown): boolean {
  return candidate instanceof ApprovalCommandError;
}
