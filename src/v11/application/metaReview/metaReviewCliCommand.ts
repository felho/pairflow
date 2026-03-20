import {
  getMetaReviewLastReportV11 as getMetaReviewLastReport,
  getMetaReviewStatusV11 as getMetaReviewStatus,
  runMetaReviewV11 as runMetaReview,
  submitMetaReviewResultV11 as submitMetaReviewResult,
  toMetaReviewErrorV11 as toMetaReviewError,
  type MetaReviewLastReportViewV11 as MetaReviewLastReportView,
  type MetaReviewRunResultV11 as MetaReviewRunResult,
  type MetaReviewStatusViewV11 as MetaReviewStatusView,
  type MetaReviewSubmitResultV11 as MetaReviewSubmitResult
} from "./emitMetaReviewV11.js";
import {
  recoverMetaReviewGateFromSnapshotV11 as recoverMetaReviewGateFromSnapshot,
  type MetaReviewGateResultV11 as MetaReviewGateResult
} from "../metaReviewGate/emitMetaReviewGateV11.js";
import {
  getBubbleMetaReviewHelpText,
  parseBubbleMetaReviewCommandOptions,
  type BubbleMetaReviewCommandOptions
} from "./metaReviewCliOptions.js";
import { isRecord } from "../../../core/validation.js";

export {
  getBubbleMetaReviewHelpText,
  parseBubbleMetaReviewCommandOptions
};
export type {
  BubbleMetaReviewHelpCommandOptions,
  BubbleMetaReviewLastReportCommandOptions,
  BubbleMetaReviewRecoverCommandOptions,
  BubbleMetaReviewRunCommandOptions,
  BubbleMetaReviewStatusCommandOptions,
  BubbleMetaReviewSubmitCommandOptions
} from "./metaReviewCliOptions.js";

export type BubbleMetaReviewCommandResult =
  | {
    command: "run";
    run: MetaReviewRunResult;
  }
  | {
    command: "status";
    status: MetaReviewStatusView;
  }
  | {
    command: "last-report";
    lastReport: MetaReviewLastReportView;
  }
  | {
    command: "recover";
    recover: MetaReviewGateResult;
  }
  | {
    command: "submit";
    submit: MetaReviewSubmitResult;
  };

export function renderMetaReviewRunText(result: MetaReviewRunResult): string {
  const lines = [
    `Meta-review run for ${result.bubbleId}: status=${result.status}, recommendation=${result.recommendation}, depth=${result.depth}`,
    `Updated: ${result.updated_at}`,
    `Lifecycle state: ${result.lifecycle_state}`,
    `Summary: ${result.summary ?? "-"}`,
    `Report ref: ${result.report_ref}`
  ];
  if (typeof result.run_id === "string" && result.run_id.trim().length > 0) {
    lines.splice(1, 0, `Run id: ${result.run_id}`);
  }

  if (result.rework_target_message !== null) {
    lines.push(`Rework target: ${result.rework_target_message}`);
  }
  if (isRecord(result.report_json)) {
    const claimed = result.report_json.findings_claimed_open_total
      ?? result.report_json.findings_count;
    const artifact = result.report_json.findings_artifact_open_total;
    const status = result.report_json.findings_parity_status;
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

  if (result.warnings.length > 0) {
    lines.push(
      `Warnings: ${result.warnings
        .map((warning) => warning.reason_code)
        .join(", ")}`
    );
  }

  return lines.join("\n");
}

export function renderMetaReviewSubmitText(result: MetaReviewSubmitResult): string {
  const lines = [
    `Meta-review submit for ${result.bubbleId}: status=${result.status}, recommendation=${result.recommendation}`,
    `Updated: ${result.updated_at}`,
    `Lifecycle state: ${result.lifecycle_state}`,
    `Summary: ${result.summary ?? "-"}`,
    `Report ref: ${result.report_ref}`
  ];
  if (typeof result.run_id === "string" && result.run_id.trim().length > 0) {
    lines.splice(1, 0, `Run id: ${result.run_id}`);
  }

  if (result.rework_target_message !== null) {
    lines.push(`Rework target: ${result.rework_target_message}`);
  }
  if (isRecord(result.report_json)) {
    const claimed = result.report_json.findings_claimed_open_total
      ?? result.report_json.findings_count;
    const artifact = result.report_json.findings_artifact_open_total;
    const status = result.report_json.findings_parity_status;
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

  if (result.warnings.length > 0) {
    lines.push(
      `Warnings: ${result.warnings
        .map((warning) => warning.reason_code)
        .join(", ")}`
    );
  }

  return lines.join("\n");
}

export function renderMetaReviewStatusText(
  view: MetaReviewStatusView,
  verbose: boolean
): string {
  const lines = [
    `Meta-review status for ${view.bubbleId}: has_run=${view.has_run ? "yes" : "no"}`,
    `Auto rework: ${view.auto_rework_count}/${view.auto_rework_limit}`,
    `Sticky human gate: ${view.sticky_human_gate ? "yes" : "no"}`
  ];

  if (!view.has_run) {
    lines.push("Last autonomous status: -");
    lines.push("Last autonomous recommendation: -");
    return lines.join("\n");
  }

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

  if (verbose) {
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
  if (view.parity_diagnostics.length > 0) {
    lines.push(`Parity diagnostics: ${view.parity_diagnostics.join("; ")}`);
  }
  if (verbose) {
    lines.push(`Findings artifact status: ${view.findings_artifact_status ?? "-"}`);
    lines.push(`Findings digest: ${view.findings_digest_sha256 ?? "-"}`);
    lines.push(`Meta-review run id: ${view.meta_review_run_id ?? "-"}`);
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

export async function runBubbleMetaReviewCommand(
  args: string[] | BubbleMetaReviewCommandOptions,
  cwd: string = process.cwd()
): Promise<BubbleMetaReviewCommandResult | null> {
  try {
    const options =
      Array.isArray(args) ? parseBubbleMetaReviewCommandOptions(args) : args;
    if (options.help) {
      return null;
    }

    if (options.command === "run") {
      const run = await runMetaReview({
        bubbleId: options.id,
        ...(options.repo !== undefined ? { repoPath: options.repo } : {}),
        depth: options.depth,
        cwd
      });
      return {
        command: "run",
        run
      };
    }

    if (options.command === "submit") {
      const submit = await submitMetaReviewResult({
        bubbleId: options.id,
        ...(options.repo !== undefined ? { repoPath: options.repo } : {}),
        round: options.round,
        recommendation: options.recommendation,
        summary: options.summary,
        report_markdown: options.reportMarkdown,
        rework_target_message: options.reworkTargetMessage,
        ...(options.reportJson !== undefined
          ? { report_json: options.reportJson }
          : {}),
        cwd
      });
      return {
        command: "submit",
        submit
      };
    }

    if (options.command === "status") {
      const status = await getMetaReviewStatus({
        bubbleId: options.id,
        ...(options.repo !== undefined ? { repoPath: options.repo } : {}),
        cwd
      });
      return {
        command: "status",
        status
      };
    }
    if (options.command === "last-report") {
      const lastReport = await getMetaReviewLastReport({
        bubbleId: options.id,
        ...(options.repo !== undefined ? { repoPath: options.repo } : {}),
        cwd
      });
      return {
        command: "last-report",
        lastReport
      };
    }
    if (options.command === "recover") {
      const recover = await recoverMetaReviewGateFromSnapshot({
        bubbleId: options.id,
        ...(options.repo !== undefined ? { repoPath: options.repo } : {}),
        cwd
      });
      return {
        command: "recover",
        recover
      };
    }

    throw new Error(
      "META_REVIEW_SUBCOMMAND_UNEXPECTED: Unexpected meta-review subcommand. context: command_name=meta-review."
    );
  } catch (error) {
    throw toMetaReviewError(error);
  }
}
