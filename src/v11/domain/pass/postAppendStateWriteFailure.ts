export function formatPostAppendStateWriteFailureMessage(input: {
  envelopeId: string;
  reason: string;
}): string {
  return `PASS ${input.envelopeId} was appended but state update failed. Transcript remains canonical; recover state from transcript tail. Root error: ${input.reason}`;
}

export function raisePostAppendStateWriteFailed(input: {
  envelopeId: string;
  reason: string;
  createError: (message: string) => Error;
}): never {
  // reason_code=PASS_STATE_WRITE_FAILED_POST_APPEND context=post_append_state_write
  throw input.createError(
    formatPostAppendStateWriteFailureMessage({
      envelopeId: input.envelopeId,
      reason: input.reason
    })
  );
}
