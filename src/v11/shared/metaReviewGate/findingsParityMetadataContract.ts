export const findingsParityStatuses = [
  "ok",
  "mismatch",
  "guard_failed"
] as const;

export type FindingsParityStatus = (typeof findingsParityStatuses)[number];

export interface FindingsParityMetadata {
  findings_claimed_open_total?: number | null;
  findings_artifact_open_total?: number | null;
  findings_blocking_open_total?: number | null;
  findings_advisory_open_total?: number | null;
  findings_artifact_status?: string | null;
  findings_digest_sha256?: string | null;
  meta_review_run_id?: string | null;
  findings_parity_status?: FindingsParityStatus | null;
}

export interface ApproveFindingsSplitMetadata extends FindingsParityMetadata {
  findings_claimed_open_total: number;
  findings_blocking_open_total: number;
  findings_advisory_open_total: number;
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

export function hasApproveFindingsSplitMetadata(
  metadata: FindingsParityMetadata | null | undefined
): metadata is ApproveFindingsSplitMetadata {
  if (metadata === null || metadata === undefined) {
    return false;
  }
  return (
    isNonNegativeInteger(metadata.findings_claimed_open_total) &&
    isNonNegativeInteger(metadata.findings_blocking_open_total) &&
    isNonNegativeInteger(metadata.findings_advisory_open_total)
  );
}

export function resolveFindingsParityMetadataForEnvelope(
  metadata: FindingsParityMetadata | null | undefined
): Record<string, unknown> {
  if (metadata === null || metadata === undefined) {
    return {};
  }
  const envelopeMetadata: Record<string, unknown> = {};
  if (metadata.findings_claimed_open_total !== undefined) {
    envelopeMetadata.findings_claimed_open_total =
      metadata.findings_claimed_open_total;
  }
  if (metadata.findings_artifact_open_total !== undefined) {
    envelopeMetadata.findings_artifact_open_total =
      metadata.findings_artifact_open_total;
  }
  if (metadata.findings_blocking_open_total !== undefined) {
    envelopeMetadata.findings_blocking_open_total =
      metadata.findings_blocking_open_total;
  }
  if (metadata.findings_advisory_open_total !== undefined) {
    envelopeMetadata.findings_advisory_open_total =
      metadata.findings_advisory_open_total;
  }
  if (metadata.findings_artifact_status !== undefined) {
    envelopeMetadata.findings_artifact_status =
      metadata.findings_artifact_status;
  }
  if (metadata.findings_digest_sha256 !== undefined) {
    envelopeMetadata.findings_digest_sha256 = metadata.findings_digest_sha256;
  }
  if (metadata.meta_review_run_id !== undefined) {
    envelopeMetadata.meta_review_run_id = metadata.meta_review_run_id;
  }
  if (metadata.findings_parity_status !== undefined) {
    envelopeMetadata.findings_parity_status = metadata.findings_parity_status;
  }
  return envelopeMetadata;
}
