import {
  emptyMetaReviewFindingsParitySnapshot,
  type MetaReviewFindingsParitySnapshot
} from "./metaReviewRuntimeParity.js";
import type {
  MetaReviewLastReportView,
  MetaReviewStatusView
} from "./metaReviewTypes.js";
import type { BubbleMetaReviewSnapshotState } from "../../../types/bubble.js";

export function createMetaReviewStatusView(input: {
  bubbleId: string;
  snapshot: BubbleMetaReviewSnapshotState;
  projectionFreshness: MetaReviewStatusView["projection_freshness"];
  parity?: MetaReviewFindingsParitySnapshot;
  parityDiagnostics?: string[];
}): MetaReviewStatusView {
  const parity = input.parity ?? emptyMetaReviewFindingsParitySnapshot;
  const parityDiagnostics = input.parityDiagnostics ?? [];
  const hasRun =
    input.snapshot.last_autonomous_status !== null &&
    input.snapshot.last_autonomous_recommendation !== null;

  return {
    bubbleId: input.bubbleId,
    has_run: hasRun,
    operator_surface: "projection_only",
    projection_freshness: input.projectionFreshness,
    auto_rework_count: input.snapshot.auto_rework_count,
    auto_rework_limit: input.snapshot.auto_rework_limit,
    sticky_human_gate: input.snapshot.sticky_human_gate,
    last_autonomous_run_id: input.snapshot.last_autonomous_run_id,
    last_autonomous_status: input.snapshot.last_autonomous_status,
    last_autonomous_recommendation:
      input.snapshot.last_autonomous_recommendation,
    last_autonomous_summary: input.snapshot.last_autonomous_summary,
    last_autonomous_report_ref: input.snapshot.last_autonomous_report_ref,
    last_autonomous_rework_target_message:
      input.snapshot.last_autonomous_rework_target_message,
    last_autonomous_updated_at: input.snapshot.last_autonomous_updated_at,
    findings_claimed_open_total: parity.findings_claimed_open_total,
    findings_artifact_open_total: parity.findings_artifact_open_total,
    findings_blocking_open_total: parity.findings_blocking_open_total,
    findings_advisory_open_total: parity.findings_advisory_open_total,
    findings_artifact_status: parity.findings_artifact_status,
    findings_digest_sha256: parity.findings_digest_sha256,
    meta_review_run_id: parity.meta_review_run_id,
    findings_parity_status: parity.findings_parity_status,
    parity_diagnostics: [...parityDiagnostics]
  };
}

export function createMetaReviewLastReportView(input: {
  bubbleId: string;
  hasReport: boolean;
  projectionFreshness: MetaReviewLastReportView["projection_freshness"];
  reportRef: string | null;
  summary: string | null;
  updatedAt: string | null;
  reportJson: Record<string, unknown> | null;
  parity: MetaReviewFindingsParitySnapshot;
  parityDiagnostics: string[];
}): MetaReviewLastReportView {
  return {
    bubbleId: input.bubbleId,
    has_report: input.hasReport,
    operator_surface: "projection_only",
    projection_freshness: input.projectionFreshness,
    report_ref: input.reportRef,
    summary: input.summary,
    updated_at: input.updatedAt,
    report_json: input.reportJson,
    findings_claimed_open_total: input.parity.findings_claimed_open_total,
    findings_artifact_open_total: input.parity.findings_artifact_open_total,
    findings_blocking_open_total: input.parity.findings_blocking_open_total,
    findings_advisory_open_total: input.parity.findings_advisory_open_total,
    findings_artifact_status: input.parity.findings_artifact_status,
    findings_digest_sha256: input.parity.findings_digest_sha256,
    meta_review_run_id: input.parity.meta_review_run_id,
    findings_parity_status: input.parity.findings_parity_status,
    parity_diagnostics: [...input.parityDiagnostics]
  };
}
