export function formatReplyPostAppendStateWriteFailureMessage(input: {
  envelopeId: string;
  reason: string;
}): string {
  return `HUMAN_REPLY ${input.envelopeId} was appended but state update failed. Transcript remains canonical; recover state from transcript tail. Root error: ${input.reason}`;
}

export function raiseReplyPostAppendStateWriteFailed(input: {
  envelopeId: string;
  reason: string;
  createError: PairflowCreateCommandError;
}): never {
  throw input.createError({
    reasonCode: "REPLY_STATE_WRITE_FAILED_POST_APPEND",
    message: formatReplyPostAppendStateWriteFailureMessage({
      envelopeId: input.envelopeId,
      reason: input.reason
    }),
    context: {
      command_name: "reply",
      envelope_id: input.envelopeId
    },
    cause: input.reason
  });
}
