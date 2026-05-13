export const legacyMetaReviewerProtocolRecipient = "meta-reviewer" as const;

export type LegacyMetaReviewerProtocolRecipient =
  typeof legacyMetaReviewerProtocolRecipient;

export function isLegacyMetaReviewerProtocolRecipient(
  value: unknown
): value is LegacyMetaReviewerProtocolRecipient {
  return value === legacyMetaReviewerProtocolRecipient;
}
