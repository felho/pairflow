export function formatPostAppendReviewVerificationWriteFailureMessage(input: {
  envelopeId: string;
  reason: string;
}): string {
  return `PASS ${input.envelopeId} was appended but review-verification artifact write failed before state transition. State remains unchanged and transcript is canonical; recover via state reconciliation from transcript tail after fixing artifact path/input. Root error: ${input.reason}`;
}

export function raisePostAppendReviewVerificationWriteFailed(input: {
  envelopeId: string;
  reason: string;
  createError: (message: string) => Error;
}): never {
  // reason_code=PASS_REVIEW_VERIFICATION_WRITE_FAILED_POST_APPEND context=post_append_review_verification_artifact_write
  throw input.createError(
    formatPostAppendReviewVerificationWriteFailureMessage({
      envelopeId: input.envelopeId,
      reason: input.reason
    })
  );
}
