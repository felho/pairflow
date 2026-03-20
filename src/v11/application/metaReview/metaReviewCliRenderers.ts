import type {
  MetaReviewLastReportViewV11 as MetaReviewLastReportView,
  MetaReviewRunResultV11 as MetaReviewRunResult,
  MetaReviewStatusViewV11 as MetaReviewStatusView,
  MetaReviewSubmitResultV11 as MetaReviewSubmitResult
} from "./emitMetaReviewV11.js";
import type { MetaReviewGateResultV11 as MetaReviewGateResult } from "../metaReviewGate/emitMetaReviewGateV11.js";
import { isRecord } from "../../../core/validation.js";

interface MetaReviewRenderedResultLike {
  bubbleId: string;
  status: string;
  recommendation: string;
  updated_at: string;
  lifecycle_state: string;
  summary: string | null;
  report_ref: string;
  run_id?: string;
  rework_target_message: string | null;
  report_json?: Record<string, unknown> | null;
  warnings: Array<{
    reason_code: string;
  }>;
}

function appendMetaReviewOptionalRunId(
  lines: string[],
  runId: string | undefined
): void {
  if (typeof runId === "string" && runId.trim().length > 0) {
    lines.splice(1, 0, `Run id: ${runId}`);
  }
}

function appendMetaReviewOptionalReworkTarget(
  lines: string[],
  reworkTargetMessage: string | null
): void {
  if (reworkTargetMessage !== null) {
    lines.push(`Rework target: ${reworkTargetMessage}`);
  }
}

function appendMetaReviewOptionalFindingsParityLine(
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

function appendMetaReviewOptionalWarnings(
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

function buildMetaReviewOutcomeHeaderLines(input: {
  label: "run" | "submit";
  result: MetaReviewRenderedResultLike;
  depth?: string;
}): string[] {
  const { label, result, depth } = input;
  return [
    `Meta-review ${label} for ${result.bubbleId}: status=${result.status}, recommendation=${result.recommendation}${label === "run" ? `, depth=${depth ?? "standard"}` : ""}`,
    `Updated: ${result.updated_at}`,
    `Lifecycle state: ${result.lifecycle_state}`,
    `Summary: ${result.summary ?? "-"}`,
    `Report ref: ${result.report_ref}`
  ];
}

export function renderMetaReviewRunText(result: MetaReviewRunResult): string {
  const lines = buildMetaReviewOutcomeHeaderLines({
    label: "run",
    result,
    depth: result.depth
  });
  appendMetaReviewOptionalRunId(lines, result.run_id);
  appendMetaReviewOptionalReworkTarget(lines, result.rework_target_message);
  appendMetaReviewOptionalFindingsParityLine(lines, result.report_json);
  appendMetaReviewOptionalWarnings(lines, result.warnings);

  return lines.join("\n");
}

export function renderMetaReviewSubmitText(result: MetaReviewSubmitResult): string {
  const lines = buildMetaReviewOutcomeHeaderLines({
    label: "submit",
    result
  });
  appendMetaReviewOptionalRunId(lines, result.run_id);
  appendMetaReviewOptionalReworkTarget(lines, result.rework_target_message);
  appendMetaReviewOptionalFindingsParityLine(lines, result.report_json);
  appendMetaReviewOptionalWarnings(lines, result.warnings);

  return lines.join("\n");
}

function buildMetaReviewStatusHeaderLines(view: MetaReviewStatusView): string[] {
  return [
    `Meta-review status for ${view.bubbleId}: has_run=${view.has_run ? "yes" : "no"}`,
    `Auto rework: ${view.auto_rework_count}/${view.auto_rework_limit}`,
    `Sticky human gate: ${view.sticky_human_gate ? "yes" : "no"}`
  ];
}

function appendMetaReviewMissingRunLines(lines: string[]): void {
  lines.push("Last autonomous status: -");
  lines.push("Last autonomous recommendation: -");
}

function appendMetaReviewStatusRunLines(
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

function appendMetaReviewStatusVerboseLines(
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

export function renderMetaReviewStatusText(
  view: MetaReviewStatusView,
  verbose: boolean
): string {
  const lines = buildMetaReviewStatusHeaderLines(view);

  if (!view.has_run) {
    appendMetaReviewMissingRunLines(lines);
    return lines.join("\n");
  }

  appendMetaReviewStatusRunLines(lines, view);

  if (verbose) {
    appendMetaReviewStatusVerboseLines(lines, view);
  }

  return lines.join("\n");
}

function appendMetaReviewParityDiagnostics(
  lines: string[],
  parityDiagnostics: string[]
): void {
  if (parityDiagnostics.length > 0) {
    lines.push(`Parity diagnostics: ${parityDiagnostics.join("; ")}`);
  }
}

function appendMetaReviewLastReportVerboseLines(
  lines: string[],
  view: MetaReviewLastReportView
): void {
  lines.push(`Findings artifact status: ${view.findings_artifact_status ?? "-"}`);
  lines.push(`Findings digest: ${view.findings_digest_sha256 ?? "-"}`);
  lines.push(`Meta-review run id: ${view.meta_review_run_id ?? "-"}`);
}

export function renderMetaReviewLastReportText(
  view: MetaReviewLastReportView,
  verbose: boolean
): string {
  const lines = [
    `Meta-review last report for ${view.bubbleId}: has_report=${view.has_report ? "yes" : "no"}`,
    `Report ref: ${view.report_ref ?? "-"}`,
    `Summary: ${view.summary ?? "-"}`,
    `Updated: ${view.updated_at ?? "-"}`,
    `Findings parity: claimed=${view.findings_claimed_open_total ?? "-"}, artifact=${view.findings_artifact_open_total ?? "-"}, status=${view.findings_parity_status ?? "-"}`
  ];
  appendMetaReviewParityDiagnostics(lines, view.parity_diagnostics);
  if (verbose) {
    appendMetaReviewLastReportVerboseLines(lines, view);
  }

  if (verbose && view.report_markdown !== null) {
    lines.push("");
    lines.push(view.report_markdown.trimEnd());
  }

  return lines.join("\n");
}

export function renderMetaReviewRecoverText(result: MetaReviewGateResult): string {
  const lines = [
    `Meta-review recovery for ${result.bubbleId}: route=${result.route}`,
    `Gate envelope: ${result.gateEnvelope.type} ${result.gateEnvelope.id}`,
    `Lifecycle state: ${result.state.state}`
  ];
  return lines.join("\n");
}
