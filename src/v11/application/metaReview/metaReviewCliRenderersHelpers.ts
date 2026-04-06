import { isRecord } from "../../../core/validation.js";
import type {
  MetaReviewLastReportViewV11 as MetaReviewLastReportView,
  MetaReviewStatusViewV11 as MetaReviewStatusView
} from "./emitMetaReviewV11.js";
import type { MetaReviewGateResultV11 as MetaReviewGateResult } from "../metaReviewGate/emitMetaReviewGateV11.js";

interface MetaReviewRenderedResultLike {
  bubbleId: string;
  status: string;
  recommendation: string;
  updated_at: string;
  lifecycle_state: string;
  gate_route?: string;
  summary: string | null;
  report_ref: string;
  run_id?: string;
  rework_target_message: string | null;
  report_json?: Record<string, unknown> | null;
  warnings: Array<{
    reason_code: string;
  }>;
}

export function formatMetaReviewProjectionFreshness(
  freshness: MetaReviewStatusView["projection_freshness"]
): string {
  switch (freshness) {
    case "no_snapshot":
      return "no_snapshot";
    case "current_round":
      return "current_round";
    case "stale":
      return "stale";
    case "ahead":
      return "ahead";
    case "round_missing":
      return "round_missing";
    case "unknown":
      return "unknown";
  }
  const unreachable: never = freshness;
  throw new Error(
    `META_REVIEW_PROJECTION_FRESHNESS_UNEXPECTED: ${String(unreachable)}`
  );
}

export function appendMetaReviewOptionalRunId(
  lines: string[],
  runId: string | undefined
): void {
  if (typeof runId === "string" && runId.trim().length > 0) {
    lines.splice(1, 0, `Run id: ${runId}`);
  }
}

export function appendMetaReviewOptionalReworkTarget(
  lines: string[],
  reworkTargetMessage: string | null
): void {
  if (reworkTargetMessage !== null) {
    lines.push(`Rework target: ${reworkTargetMessage}`);
  }
}

export function appendMetaReviewOptionalFindingsParityLine(
  lines: string[],
  reportJson: Record<string, unknown> | null | undefined
): void {
  if (!isRecord(reportJson)) {
    return;
  }

  const claimed = reportJson.findings_claimed_open_total
    ?? reportJson.findings_count;
  const artifact = reportJson.findings_artifact_open_total;
  const status = reportJson.findings_parity_status;
  if (
    (typeof claimed === "number" && Number.isInteger(claimed)) ||
    (typeof artifact === "number" && Number.isInteger(artifact)) ||
    (typeof status === "string" && status.trim().length > 0)
  ) {
    lines.push(
      `Findings parity: claimed=${typeof claimed === "number" ? claimed : "?"}, artifact=${typeof artifact === "number" ? artifact : "?"}, status=${typeof status === "string" ? status : "unknown"}`
    );
  }
}

export function appendMetaReviewOptionalWarnings(
  lines: string[],
  warnings: Array<{
    reason_code: string;
  }>
): void {
  if (warnings.length > 0) {
    lines.push(
      `Warnings: ${warnings
        .map((warning) => warning.reason_code)
        .join(", ")}`
    );
  }
}

export function buildMetaReviewSubmitHeaderLines(
  result: MetaReviewRenderedResultLike
): string[] {
  const lines = [
    `Meta-review submit for ${result.bubbleId}: status=${result.status}, recommendation=${result.recommendation}`,
    `Updated: ${result.updated_at}`,
    `Summary: ${result.summary ?? "-"}`,
    `Report ref: ${result.report_ref}`
  ];
  if (typeof result.gate_route === "string") {
    lines.splice(2, 0, `Gate route: ${result.gate_route}`);
  }
  lines.splice(
    typeof result.gate_route === "string" ? 3 : 2,
    0,
    `Lifecycle state: ${result.lifecycle_state}`
  );
  return lines;
}

export function buildMetaReviewStatusHeaderLines(view: MetaReviewStatusView): string[] {
  return [
    `Meta-review status projection for ${view.bubbleId}: has_run=${view.has_run ? "yes" : "no"}, freshness=${formatMetaReviewProjectionFreshness(view.projection_freshness)}`,
    "Operator surface: projection-only read path (no live rerun, no operator-origin submit authority)",
    `Auto rework: ${view.auto_rework_count}/${view.auto_rework_limit}`,
    `Sticky human gate: ${view.sticky_human_gate ? "yes" : "no"}`
  ];
}

export function appendMetaReviewMissingRunLines(lines: string[]): void {
  lines.push("Last autonomous status: -");
  lines.push("Last autonomous recommendation: -");
}

export function appendMetaReviewStatusRunLines(
  lines: string[],
  view: MetaReviewStatusView
): void {
  lines.push(`Last autonomous status: ${view.last_autonomous_status ?? "-"}`);
  lines.push(
    `Last autonomous recommendation: ${view.last_autonomous_recommendation ?? "-"}`
  );
  lines.push(`Last updated: ${view.last_autonomous_updated_at ?? "-"}`);
  lines.push(
    `Findings parity: claimed=${view.findings_claimed_open_total ?? "-"}, artifact=${view.findings_artifact_open_total ?? "-"}, status=${view.findings_parity_status ?? "-"}`
  );
  if (view.parity_diagnostics.length > 0) {
    lines.push(`Parity diagnostics: ${view.parity_diagnostics.join("; ")}`);
  }
}

export function appendMetaReviewStatusVerboseLines(
  lines: string[],
  view: MetaReviewStatusView
): void {
  lines.push(`Last summary: ${view.last_autonomous_summary ?? "-"}`);
  lines.push(`Last report ref: ${view.last_autonomous_report_ref ?? "-"}`);
  lines.push(
    `Last rework target: ${view.last_autonomous_rework_target_message ?? "-"}`
  );
  if (
    typeof view.last_autonomous_run_id === "string" &&
    view.last_autonomous_run_id.trim().length > 0
  ) {
    lines.push(`Last run id: ${view.last_autonomous_run_id}`);
  }
  lines.push(`Last findings artifact status: ${view.findings_artifact_status ?? "-"}`);
  lines.push(`Last findings digest: ${view.findings_digest_sha256 ?? "-"}`);
  lines.push(`Last meta-review run id: ${view.meta_review_run_id ?? "-"}`);
}

export function appendMetaReviewParityDiagnostics(
  lines: string[],
  parityDiagnostics: string[]
): void {
  if (parityDiagnostics.length > 0) {
    lines.push(`Parity diagnostics: ${parityDiagnostics.join("; ")}`);
  }
}

export function appendMetaReviewLastReportVerboseLines(
  lines: string[],
  view: MetaReviewLastReportView
): void {
  lines.push(`Findings artifact status: ${view.findings_artifact_status ?? "-"}`);
  lines.push(`Findings digest: ${view.findings_digest_sha256 ?? "-"}`);
  lines.push(`Meta-review run id: ${view.meta_review_run_id ?? "-"}`);
}

export function buildMetaReviewRecoverText(result: MetaReviewGateResult): string[] {
  return [
    `Meta-review recovery for ${result.bubbleId}: route=${result.route}`,
    "Recovery mode: snapshot-route replay only (no live rerun, no operator-origin submit authority)",
    `Gate envelope: ${result.gateEnvelope.type} ${result.gateEnvelope.id}`,
    `Lifecycle state: ${result.state.state}`
  ];
}
