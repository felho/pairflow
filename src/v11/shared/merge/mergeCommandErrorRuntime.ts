import {
  normalizePairflowCommandErrorInput,
  withRequiredCommandContext
} from "../errors/commandErrorDetails.js";

export class BubbleMergeError extends Error {
  public readonly reasonCode: string | undefined;
  public readonly context: PairflowCommandErrorContext | undefined;

  public constructor(input: PairflowCommandErrorInput) {
    const normalized = normalizePairflowCommandErrorInput(input);
    super(normalized.message, { cause: normalized.cause });
    this.name = "BubbleMergeError";
    this.reasonCode = normalized.reasonCode;
    this.context = withRequiredCommandContext(normalized.context, "merge");
  }
}

export function createBubbleMergeError(
  input: PairflowCommandErrorInput
): BubbleMergeError {
  return new BubbleMergeError(input);
}
