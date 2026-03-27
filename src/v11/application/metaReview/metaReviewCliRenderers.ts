import type {
  MetaReviewLastReportViewV11 as MetaReviewLastReportView,
  MetaReviewRunResultV11 as MetaReviewRunResult,
  MetaReviewStatusViewV11 as MetaReviewStatusView,
  MetaReviewSubmitResultV11 as MetaReviewSubmitResult
} from "./emitMetaReviewV11.js";
import type { MetaReviewGateResultV11 as MetaReviewGateResult } from "../metaReviewGate/emitMetaReviewGateV11.js";
import {
  appendMetaReviewLastReportVerboseLines,
  appendMetaReviewMissingRunLines,
  appendMetaReviewOptionalFindingsParityLine,
  appendMetaReviewOptionalReworkTarget,
  appendMetaReviewOptionalRunId,
  appendMetaReviewOptionalWarnings,
  appendMetaReviewParityDiagnostics,
  appendMetaReviewStatusRunLines,
  appendMetaReviewStatusVerboseLines,
  buildMetaReviewOutcomeHeaderLines,
  buildMetaReviewRecoverText,
  buildMetaReviewStatusHeaderLines
} from "./metaReviewCliRenderersHelpers.js";

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

  return lines.join("\n");
}

export function renderMetaReviewRecoverText(result: MetaReviewGateResult): string {
  const lines = buildMetaReviewRecoverText(result);
  return lines.join("\n");
}
