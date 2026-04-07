import { normalizePairflowCommandErrorInput } from "../errors/commandErrorDetails.js";

export class BubbleWatchdogError extends Error {
  public readonly reasonCode: string | undefined;
  public readonly context: PairflowCommandErrorContext | undefined;

  public constructor(input: PairflowCommandErrorInput) {
    const normalized = normalizePairflowCommandErrorInput(input);
    super(normalized.message, { cause: normalized.cause });
    this.name = "BubbleWatchdogError";
    this.reasonCode = normalized.reasonCode;
    this.context = normalized.context;
  }
}

export function createBubbleWatchdogError(
  input: PairflowCommandErrorInput
): BubbleWatchdogError {
  return new BubbleWatchdogError(input);
}
