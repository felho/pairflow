import type { ApprovalAdvisoryFinding } from "../../metaReviewGate/metaReviewGateApprovalParityState.js";
import {
  isNonEmptyString
} from "../../validation/primitives.js";
import type {
  FindingsParityStatus
} from "../../../../types/protocol.js";
import {
  resolveAdvisoryFindingsFromReportJson,
  resolveFindingsOpenSplitFromReportJson
} from "../../metaReviewGate/metaReviewGateFindingsSplit.js";

export interface MetaReviewFindingsParitySnapshot {
  findings_claimed_open_total: number | null;
  findings_artifact_open_total: number | null;
  findings_blocking_open_total: number | null;
  findings_advisory_open_total: number | null;
  findings_artifact_status: string | null;
  findings_digest_sha256: string | null;
  meta_review_run_id: string | null;
  findings_parity_status: FindingsParityStatus | null;
}

const emptyMetaReviewFindingsParitySnapshot: MetaReviewFindingsParitySnapshot = {
  findings_claimed_open_total: null,
  findings_artifact_open_total: null,
  findings_blocking_open_total: null,
  findings_advisory_open_total: null,
  findings_artifact_status: null,
  findings_digest_sha256: null,
  meta_review_run_id: null,
  findings_parity_status: null
};

function normalizeNonNegativeInt(value: unknown): number | null {
  return typeof value === "number" && Number.isInteger(value) && value >= 0
    ? value
    : null;
}

export function readMetaReviewFindingsParitySnapshot(
  reportJson: Record<string, unknown> | undefined
): MetaReviewFindingsParitySnapshot {
  if (reportJson === undefined) {
    return { ...emptyMetaReviewFindingsParitySnapshot };
  }
  const claimCount = normalizeNonNegativeInt(
    reportJson.findings_claimed_open_total ?? reportJson.findings_count
  );
  const artifactCount = normalizeNonNegativeInt(
    reportJson.findings_artifact_open_total
  );
  const explicitBlockingCount = normalizeNonNegativeInt(
    reportJson.findings_blocking_open_total
  );
  const explicitAdvisoryCount = normalizeNonNegativeInt(
    reportJson.findings_advisory_open_total
  );
  const splitFromReportJson = resolveFindingsOpenSplitFromReportJson(reportJson);
  const blockingCount =
    explicitBlockingCount ?? splitFromReportJson.findings_blocking_open_total;
  const advisoryCount =
    explicitAdvisoryCount ?? splitFromReportJson.findings_advisory_open_total;
  const artifactStatus = isNonEmptyString(reportJson.findings_artifact_status)
    ? reportJson.findings_artifact_status.trim()
    : isNonEmptyString(reportJson.artifact_status)
      ? reportJson.artifact_status.trim()
      : null;
  const digest = isNonEmptyString(reportJson.findings_digest_sha256)
    ? reportJson.findings_digest_sha256.trim().toLowerCase()
    : null;
  const runId = isNonEmptyString(reportJson.meta_review_run_id)
    ? reportJson.meta_review_run_id.trim()
    : isNonEmptyString(reportJson.findings_run_id)
      ? reportJson.findings_run_id.trim()
      : null;
  const parityStatusRaw = isNonEmptyString(reportJson.findings_parity_status)
    ? reportJson.findings_parity_status.trim()
    : null;
  let parityStatus: "ok" | "mismatch" | "guard_failed" | null = null;
  if (
    parityStatusRaw === "ok" ||
    parityStatusRaw === "mismatch" ||
    parityStatusRaw === "guard_failed"
  ) {
    parityStatus = parityStatusRaw;
  }

  return {
    findings_claimed_open_total: claimCount,
    findings_artifact_open_total: artifactCount,
    findings_blocking_open_total: blockingCount,
    findings_advisory_open_total: advisoryCount,
    findings_artifact_status: artifactStatus,
    findings_digest_sha256: digest,
    meta_review_run_id: runId,
    findings_parity_status: parityStatus
  };
}

export function readApprovalAdvisoryFindingsSnapshot(
  reportJson: Record<string, unknown> | undefined
): ApprovalAdvisoryFinding[] | undefined {
  return resolveAdvisoryFindingsFromReportJson(reportJson);
}
