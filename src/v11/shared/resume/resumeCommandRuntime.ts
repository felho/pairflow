import { asHumanReplyCommandError } from "../../../core/human/reply.js";
import { normalizeResumeBubbleError } from "./resumeCommandErrorNormalization.js";

export class ResumeBubbleError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "ResumeBubbleError";
  }
}

export function createResumeBubbleError(message: string): ResumeBubbleError {
  return new ResumeBubbleError(message);
}

export function throwAsResumeBubbleError(error: unknown): never {
  throw normalizeResumeBubbleError({
    error,
    isResumeBubbleError: (candidate) => candidate instanceof ResumeBubbleError,
    asHumanReplyCommandError,
    createResumeBubbleError
  });
}
