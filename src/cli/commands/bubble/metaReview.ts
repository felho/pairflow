import { parseArgs } from "node:util";

import {
  getMetaReviewLastReport,
  getMetaReviewStatus,
  MetaReviewError,
  submitMetaReviewResult,
  runMetaReview,
  toMetaReviewError,
  type MetaReviewDepth,
  type MetaReviewLastReportView,
  type MetaReviewRunResult,
  type MetaReviewSubmitResult,
  type MetaReviewStatusView
} from "../../../core/bubble/metaReview.js";
import type { MetaReviewSubmissionPayload } from "../../../types/protocol.js";
import {
  recoverMetaReviewGateFromSnapshot,
  type MetaReviewGateResult
} from "../../../core/bubble/metaReviewGate.js";
import { isRecord } from "../../../core/validation.js";

interface BubbleMetaReviewCommandBase {
  id: string;
  repo?: string;
  json: boolean;
  verbose: boolean;
  help: false;
}

export interface BubbleMetaReviewRunCommandOptions
  extends BubbleMetaReviewCommandBase {
  command: "run";
  depth: MetaReviewDepth;
}

export interface BubbleMetaReviewStatusCommandOptions
  extends BubbleMetaReviewCommandBase {
  command: "status";
}

export interface BubbleMetaReviewLastReportCommandOptions
  extends BubbleMetaReviewCommandBase {
  command: "last-report";
}

export interface BubbleMetaReviewRecoverCommandOptions
  extends BubbleMetaReviewCommandBase {
  command: "recover";
}

export interface BubbleMetaReviewSubmitCommandOptions
  extends BubbleMetaReviewCommandBase {
  command: "submit";
  round: number;
  recommendation: MetaReviewSubmissionPayload["recommendation"];
  summary: string;
  reportMarkdown: string;
  reworkTargetMessage: string | null;
  reportJson?: Record<string, unknown>;
}

export interface BubbleMetaReviewHelpCommandOptions {
  help: true;
}

export type BubbleMetaReviewCommandOptions =
  | BubbleMetaReviewRunCommandOptions
  | BubbleMetaReviewStatusCommandOptions
  | BubbleMetaReviewLastReportCommandOptions
  | BubbleMetaReviewRecoverCommandOptions
  | BubbleMetaReviewSubmitCommandOptions
  | BubbleMetaReviewHelpCommandOptions;

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

function invalidMetaReviewCliOptions(message: string): never {
  throw new MetaReviewError("META_REVIEW_SCHEMA_INVALID", message);
}

function parseDepth(value: string | undefined): MetaReviewDepth {
  if (value === undefined || value === "standard") {
    return "standard";
  }
  if (value === "deep") {
    return "deep";
  }
  return invalidMetaReviewCliOptions(
    "Invalid --depth value. Use one of: standard, deep."
  );
}

function parseSubmitRound(value: string | undefined): number {
  if (value === undefined) {
    return invalidMetaReviewCliOptions(
      "Missing required option: --round for meta-review submit."
    );
  }
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) {
    return invalidMetaReviewCliOptions(
      "Invalid --round value. Must be a positive integer."
    );
  }
  return parsed;
}

function parseSubmitRecommendation(
  value: string | undefined
): MetaReviewSubmissionPayload["recommendation"] {
  if (value === undefined) {
    return invalidMetaReviewCliOptions(
      "Missing required option: --recommendation for meta-review submit."
    );
  }
  if (value === "approve" || value === "rework" || value === "inconclusive") {
    return value;
  }
  return invalidMetaReviewCliOptions(
    "Invalid --recommendation value. Use one of: approve, rework, inconclusive."
  );
}

function parseRequiredSubmitText(
  value: string | undefined,
  optionName: "--summary" | "--report-markdown"
): string {
  if (value === undefined) {
    return invalidMetaReviewCliOptions(
      `Missing required option: ${optionName} for meta-review submit.`
    );
  }
  if (value.trim().length === 0) {
    return invalidMetaReviewCliOptions(
      `Invalid ${optionName} value. Must be non-empty.`
    );
  }
  return optionName === "--summary" ? value.trim() : value.trimEnd();
}

function parseOptionalReworkTarget(value: string | undefined): string | null {
  if (value === undefined) {
    return null;
  }
  if (value.trim().length === 0) {
    return invalidMetaReviewCliOptions(
      "Invalid --rework-target-message value. Must be non-empty when provided."
    );
  }
  return value.trim();
}

function parseSubmitReportJson(
  value: string | undefined
): Record<string, unknown> | undefined {
  if (value === undefined) {
    return undefined;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return invalidMetaReviewCliOptions(
      `Invalid --report-json value. Must be valid JSON object. ${message}`
    );
  }

  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    return invalidMetaReviewCliOptions(
      "Invalid --report-json value. Must be a JSON object."
    );
  }
  return parsed as Record<string, unknown>;
}

export function getBubbleMetaReviewHelpText(): string {
  return [
    "Usage:",
    "  pairflow bubble meta-review run --id <id> [--repo <path>] [--depth standard|deep] [--json]",
    "  pairflow bubble meta-review status --id <id> [--repo <path>] [--json] [--verbose]",
    "  pairflow bubble meta-review last-report --id <id> [--repo <path>] [--json] [--verbose]",
    "  pairflow bubble meta-review recover --id <id> [--repo <path>] [--json]",
    "  pairflow bubble meta-review submit --id <id> --round <n> --recommendation approve|rework|inconclusive --summary <text> --report-markdown <text> [--rework-target-message <text>] [--report-json <json>] [--repo <path>] [--json]",
    "",
    "Options:",
    "  --id <id>             Bubble id",
    "  --repo <path>         Optional repository path (defaults to cwd ancestry lookup)",
    "  --depth <value>       run-only depth profile: standard|deep (default: standard)",
    "  --round <n>           submit-only round number (must equal active round)",
    "  --recommendation <v>  submit-only recommendation: approve|rework|inconclusive",
    "  --summary <text>      submit-only summary text",
    "  --report-markdown <t> submit-only markdown report content",
    "  --rework-target-message <text>  submit-only rework target message",
    "  --report-json <json>  submit-only additional report JSON object",
    "  --json                Print structured JSON output",
    "  --verbose             Include additional detail in text output",
    "  -h, --help            Show this help"
  ].join("\n");
}

export function parseBubbleMetaReviewCommandOptions(
  args: string[]
): BubbleMetaReviewCommandOptions {
  let parsed: ReturnType<typeof parseArgs>;
  try {
    parsed = parseArgs({
      args,
      options: {
        id: {
          type: "string"
        },
        repo: {
          type: "string"
        },
        depth: {
          type: "string"
        },
        round: {
          type: "string"
        },
        recommendation: {
          type: "string"
        },
        summary: {
          type: "string"
        },
        "report-markdown": {
          type: "string"
        },
        "rework-target-message": {
          type: "string"
        },
        "report-json": {
          type: "string"
        },
        json: {
          type: "boolean"
        },
        verbose: {
          type: "boolean"
        },
        help: {
          type: "boolean",
          short: "h"
        }
      },
      strict: true,
      allowPositionals: true
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return invalidMetaReviewCliOptions(message);
  }

  if (parsed.values.help ?? false) {
    return { help: true };
  }

  const subcommand = parsed.positionals[0];
  if (subcommand === undefined) {
    return { help: true };
  }

  if (
    subcommand !== "run" &&
    subcommand !== "status" &&
    subcommand !== "last-report" &&
    subcommand !== "recover" &&
    subcommand !== "submit"
  ) {
    return invalidMetaReviewCliOptions(
      "Unknown meta-review subcommand. Use one of: run, status, last-report, recover, submit."
    );
  }

  const idValue = parsed.values.id;
  if (typeof idValue !== "string") {
    return invalidMetaReviewCliOptions("Missing required option: --id");
  }
  if (idValue.trim().length === 0) {
    return invalidMetaReviewCliOptions("Invalid --id value. Must be non-empty.");
  }
  const repoValue = parsed.values.repo;
  if (repoValue !== undefined && typeof repoValue !== "string") {
    return invalidMetaReviewCliOptions("Invalid --repo value.");
  }
  const jsonValue = parsed.values.json;
  if (jsonValue !== undefined && typeof jsonValue !== "boolean") {
    return invalidMetaReviewCliOptions("Invalid --json value.");
  }
  const verboseValue = parsed.values.verbose;
  if (verboseValue !== undefined && typeof verboseValue !== "boolean") {
    return invalidMetaReviewCliOptions("Invalid --verbose value.");
  }
  const depthValue = parsed.values.depth;
  if (depthValue !== undefined && typeof depthValue !== "string") {
    return invalidMetaReviewCliOptions("Invalid --depth value.");
  }
  const roundValue = parsed.values.round;
  if (roundValue !== undefined && typeof roundValue !== "string") {
    return invalidMetaReviewCliOptions("Invalid --round value.");
  }
  const recommendationValue = parsed.values.recommendation;
  if (
    recommendationValue !== undefined &&
    typeof recommendationValue !== "string"
  ) {
    return invalidMetaReviewCliOptions("Invalid --recommendation value.");
  }
  const summaryValue = parsed.values.summary;
  if (summaryValue !== undefined && typeof summaryValue !== "string") {
    return invalidMetaReviewCliOptions("Invalid --summary value.");
  }
  const reportMarkdownValue = parsed.values["report-markdown"];
  if (
    reportMarkdownValue !== undefined &&
    typeof reportMarkdownValue !== "string"
  ) {
    return invalidMetaReviewCliOptions("Invalid --report-markdown value.");
  }
  const reworkTargetMessageValue = parsed.values["rework-target-message"];
  if (
    reworkTargetMessageValue !== undefined &&
    typeof reworkTargetMessageValue !== "string"
  ) {
    return invalidMetaReviewCliOptions(
      "Invalid --rework-target-message value."
    );
  }
  const reportJsonValue = parsed.values["report-json"];
  if (reportJsonValue !== undefined && typeof reportJsonValue !== "string") {
    return invalidMetaReviewCliOptions("Invalid --report-json value.");
  }

  const base: BubbleMetaReviewCommandBase = {
    id: idValue,
    ...(repoValue !== undefined ? { repo: repoValue } : {}),
    json: jsonValue ?? false,
    verbose: verboseValue ?? false,
    help: false
  };

  if (subcommand === "run") {
    return {
      ...base,
      command: "run",
      depth: parseDepth(depthValue)
    };
  }

  if (subcommand === "submit") {
    if (depthValue !== undefined) {
      return invalidMetaReviewCliOptions(
        "--depth is only supported for meta-review run."
      );
    }
    const parsedReportJson = parseSubmitReportJson(reportJsonValue);
    return {
      ...base,
      command: "submit",
      round: parseSubmitRound(roundValue),
      recommendation: parseSubmitRecommendation(recommendationValue),
      summary: parseRequiredSubmitText(summaryValue, "--summary"),
      reportMarkdown: parseRequiredSubmitText(
        reportMarkdownValue,
        "--report-markdown"
      ),
      reworkTargetMessage: parseOptionalReworkTarget(reworkTargetMessageValue),
      ...(parsedReportJson !== undefined
        ? { reportJson: parsedReportJson }
        : {})
    };
  }

  if (
    roundValue !== undefined ||
    recommendationValue !== undefined ||
    summaryValue !== undefined ||
    reportMarkdownValue !== undefined ||
    reworkTargetMessageValue !== undefined ||
    reportJsonValue !== undefined
  ) {
    return invalidMetaReviewCliOptions(
      "--round/--recommendation/--summary/--report-markdown/--rework-target-message/--report-json are only supported for meta-review submit."
    );
  }

  if (depthValue !== undefined) {
    return invalidMetaReviewCliOptions(
      "--depth is only supported for meta-review run."
    );
  }

  return {
    ...base,
    command: subcommand
  };
}

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

    throw new Error("Unexpected meta-review subcommand.");
  } catch (error) {
    throw toMetaReviewError(error);
  }
}
