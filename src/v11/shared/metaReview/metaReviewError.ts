export type MetaReviewErrorReasonCode =
  | "META_REVIEW_REWORK_MESSAGE_INVALID"
  | "META_REVIEW_STATE_INVALID"
  | "META_REVIEW_SENDER_MISMATCH"
  | "META_REVIEW_ROUND_MISMATCH"
  | "META_REVIEW_SNAPSHOT_WRITE_CONFLICT"
  | "META_REVIEW_BUBBLE_LOOKUP_FAILED"
  | "META_REVIEW_SCHEMA_INVALID"
  | "META_REVIEW_SUMMARY_STRUCTURED_MISMATCH"
  | "META_REVIEW_SCHEMA_INVALID_COMBINATION"
  | "META_REVIEW_GATE_REVIEWER_CONVERGENCE_CONFLICT"
  | "META_REVIEW_GATE_RUN_FAILED"
  | "META_REVIEW_IO_ERROR"
  | "META_REVIEW_UNKNOWN_ERROR";

export class MetaReviewError extends Error {
  public readonly reasonCode: MetaReviewErrorReasonCode;

  public constructor(
    reasonCode: MetaReviewErrorReasonCode,
    message: string
  ) {
    super(message);
    this.name = "MetaReviewError";
    this.reasonCode = reasonCode;
  }
}
