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

export function compactFindingsParityMetadata(
  metadata: FindingsParityMetadata | null | undefined
): FindingsParityMetadata | undefined {
  if (metadata === null || metadata === undefined) {
    return undefined;
  }
  const compact: FindingsParityMetadata = {};
  if (metadata.findings_claimed_open_total !== undefined) {
    compact.findings_claimed_open_total =
      metadata.findings_claimed_open_total;
  }
  if (metadata.findings_artifact_open_total !== undefined) {
    compact.findings_artifact_open_total =
      metadata.findings_artifact_open_total;
  }
  if (metadata.findings_blocking_open_total !== undefined) {
    compact.findings_blocking_open_total =
      metadata.findings_blocking_open_total;
  }
  if (metadata.findings_advisory_open_total !== undefined) {
    compact.findings_advisory_open_total =
      metadata.findings_advisory_open_total;
  }
  if (metadata.findings_artifact_status !== undefined) {
    compact.findings_artifact_status = metadata.findings_artifact_status;
  }
  if (metadata.findings_digest_sha256 !== undefined) {
    compact.findings_digest_sha256 = metadata.findings_digest_sha256;
  }
  if (metadata.meta_review_run_id !== undefined) {
    compact.meta_review_run_id = metadata.meta_review_run_id;
  }
  if (metadata.findings_parity_status !== undefined) {
    compact.findings_parity_status = metadata.findings_parity_status;
  }
  return Object.keys(compact).length > 0 ? compact : undefined;
}
