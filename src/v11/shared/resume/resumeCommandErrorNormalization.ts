export interface NormalizeResumeBubbleErrorInput {
  error: unknown;
  isResumeBubbleError: (candidate: unknown) => boolean;
  asHumanReplyCommandError: (error: unknown) => never;
  createResumeBubbleError: PairflowCreateCommandError;
}

export function normalizeResumeBubbleError(
  input: NormalizeResumeBubbleErrorInput
): unknown {
  if (input.isResumeBubbleError(input.error)) {
    return input.error;
  }

  try {
    input.asHumanReplyCommandError(input.error);
  } catch (humanReplyError) {
    if (humanReplyError instanceof Error) {
      return input.createResumeBubbleError(humanReplyError.message);
    }
    return humanReplyError;
  }

  return input.error;
}
