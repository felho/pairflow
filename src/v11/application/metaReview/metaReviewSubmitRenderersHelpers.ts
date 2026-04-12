import { isRecord } from "../../shared/validation/primitives.js";

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
