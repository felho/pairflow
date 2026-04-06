import { asHumanReplyCommandErrorV11 as asHumanReplyCommandError } from "../../application/reply/emitReplyV11.js";
import { normalizeResumeBubbleError } from "./resumeCommandErrorNormalization.js";
import { normalizePairflowCommandErrorInput } from "../errors/commandErrorDetails.js";

export class ResumeBubbleError extends Error {
  public readonly reasonCode: string | undefined;
  public readonly context: PairflowCommandErrorContext | undefined;

  public constructor(input: PairflowCommandErrorInput) {
    const normalized = normalizePairflowCommandErrorInput(input);
    super(normalized.message, { cause: normalized.cause });
    this.name = "ResumeBubbleError";
    this.reasonCode = normalized.reasonCode;
    this.context = normalized.context;
  }
}

export function createResumeBubbleError(
  input: PairflowCommandErrorInput
): ResumeBubbleError {
  return new ResumeBubbleError(input);
}

export function throwAsResumeBubbleError(error: unknown): never {
  throw normalizeResumeBubbleError({
    error,
    isResumeBubbleError: (candidate) => candidate instanceof ResumeBubbleError,
    asHumanReplyCommandError,
    createResumeBubbleError
  });
}
