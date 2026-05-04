import {
  normalizePairflowCommandErrorInput,
  withRequiredCommandContext
} from "../../shared/errors/commandErrorDetails.js";

export class BubbleCommitError extends Error {
  public readonly reasonCode: string | undefined;
  public readonly context: PairflowCommandErrorContext | undefined;

  public constructor(input: PairflowCommandErrorInput) {
    const normalized = normalizePairflowCommandErrorInput(input);
    super(normalized.message, { cause: normalized.cause });
    this.name = "BubbleCommitError";
    this.reasonCode = normalized.reasonCode;
    this.context = withRequiredCommandContext(normalized.context, "commit");
  }
}

export function createBubbleCommitError(
  input: PairflowCommandErrorInput
): BubbleCommitError {
  return new BubbleCommitError(input);
}

export function isBubbleCommitError(candidate: unknown): boolean {
  return candidate instanceof BubbleCommitError;
}
