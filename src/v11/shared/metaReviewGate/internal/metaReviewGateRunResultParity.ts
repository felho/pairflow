import type { FindingsParityMetadata } from "../../../../types/protocol.js";
import type { MetaReviewResult } from "../../metaReview/metaReviewTypes.js";

export function mergeRunResultWithParityResolution(input: {
  runResult: MetaReviewResult;
  metadata: FindingsParityMetadata | null;
  diagnostics: string[];
}): MetaReviewResult {
  if (input.metadata === null && input.diagnostics.length === 0) {
    return input.runResult;
  }
  const reportJson = { ...(input.runResult.report_json ?? {}) };
  if (input.metadata !== null) {
    reportJson.findings_claimed_open_total = input.metadata.findings_claimed_open_total;
    reportJson.findings_artifact_open_total = input.metadata.findings_artifact_open_total;
    reportJson.findings_blocking_open_total = input.metadata.findings_blocking_open_total;
    reportJson.findings_advisory_open_total = input.metadata.findings_advisory_open_total;
    reportJson.findings_artifact_status = input.metadata.findings_artifact_status;
    reportJson.findings_digest_sha256 = input.metadata.findings_digest_sha256;
    reportJson.meta_review_run_id = input.metadata.meta_review_run_id;
    reportJson.findings_parity_status = input.metadata.findings_parity_status;
  }
  const existingDiagnostics = Array.isArray(reportJson.claim_diagnostics)
    ? reportJson.claim_diagnostics.filter(
        (entry): entry is string => typeof entry === "string"
      )
    : [];
  if (existingDiagnostics.length > 0 || input.diagnostics.length > 0) {
    reportJson.claim_diagnostics = [...existingDiagnostics, ...input.diagnostics];
  }
  return {
    ...input.runResult,
    report_json: reportJson
  };
}
