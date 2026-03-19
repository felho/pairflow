export function formatReplyPostAppendStateWriteFailureMessage(input: {
  envelopeId: string;
  reason: string;
}): string {
  return `HUMAN_REPLY ${input.envelopeId} was appended but state update failed. Transcript remains canonical; recover state from transcript tail. Root error: ${input.reason}`;
}

export function raiseReplyPostAppendStateWriteFailed(input: {
  envelopeId: string;
  reason: string;
  createError: (message: string) => Error;
}): never {
  // reason_code=REPLY_STATE_WRITE_FAILED_POST_APPEND context=post_append_state_write
  throw input.createError(
    formatReplyPostAppendStateWriteFailureMessage({
      envelopeId: input.envelopeId,
      reason: input.reason
    })
  );
}
