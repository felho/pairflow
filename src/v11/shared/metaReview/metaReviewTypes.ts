import type {
  BubbleStateSnapshot,
  MetaReviewRecommendation,
  MetaReviewRunStatus
} from "../../../types/bubble.js";
import type { FindingsParityStatus } from "../../../types/protocol.js";

export type MetaReviewDepth = "standard" | "deep";

export interface MetaReviewRunWarning {
  reason_code:
    | "META_REVIEW_RUNNER_ERROR"
    | "META_REVIEW_ARTIFACT_WRITE_WARNING"
    | "META_REVIEWER_PANE_UNAVAILABLE";
  message: string;
}

export interface MetaReviewResult {
  bubble_id: string;
  run_id?: string;
  status: MetaReviewRunStatus;
  recommendation: MetaReviewRecommendation;
  summary: string | null;
  report_ref: string;
  rework_target_message: string | null;
  updated_at: string;
  warnings: MetaReviewRunWarning[];
  report_json?: Record<string, unknown>;
}

type MetaReviewResultFields = Omit<MetaReviewResult, "bubble_id">;

export interface MetaReviewRunResult extends MetaReviewResultFields {
  bubbleId: string;
  depth: MetaReviewDepth;
  lifecycle_state: BubbleStateSnapshot["state"];
}

export interface MetaReviewStatusView {
  bubbleId: string;
  has_run: boolean;
  operator_surface: "projection_only";
  projection_freshness:
    | "no_snapshot"
    | "current_round"
    | "stale"
    | "ahead"
    | "round_missing"
    | "unknown";
  auto_rework_count: number;
  auto_rework_limit: number;
  sticky_human_gate: boolean;
  last_autonomous_run_id: string | null;
  last_autonomous_status: MetaReviewRunStatus | null;
  last_autonomous_recommendation: MetaReviewRecommendation | null;
  last_autonomous_summary: string | null;
  last_autonomous_report_ref: string | null;
  last_autonomous_rework_target_message: string | null;
  last_autonomous_updated_at: string | null;
  findings_claimed_open_total: number | null;
  findings_artifact_open_total: number | null;
  findings_blocking_open_total: number | null;
  findings_advisory_open_total: number | null;
  findings_artifact_status: string | null;
  findings_digest_sha256: string | null;
  meta_review_run_id: string | null;
  findings_parity_status: FindingsParityStatus | null;
  parity_diagnostics: string[];
}

export interface MetaReviewLastReportView {
  bubbleId: string;
  has_report: boolean;
  operator_surface: "projection_only";
  projection_freshness:
    | "no_snapshot"
    | "current_round"
    | "stale"
    | "ahead"
    | "round_missing"
    | "unknown";
  report_ref: string | null;
  summary: string | null;
  updated_at: string | null;
  report_json: Record<string, unknown> | null;
  findings_claimed_open_total: number | null;
  findings_artifact_open_total: number | null;
  findings_blocking_open_total: number | null;
  findings_advisory_open_total: number | null;
  findings_artifact_status: string | null;
  findings_digest_sha256: string | null;
  meta_review_run_id: string | null;
  findings_parity_status: FindingsParityStatus | null;
  parity_diagnostics: string[];
}
