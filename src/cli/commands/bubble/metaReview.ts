import { parseArgs } from "node:util";

import {
  getMetaReviewLastReport,
  getMetaReviewStatus,
  MetaReviewError,
  runMetaReview,
  toMetaReviewError,
  type MetaReviewDepth,
  type MetaReviewLastReportView,
  type MetaReviewRunResult,
  type MetaReviewStatusView
} from "../../../core/bubble/metaReview.js";
import {
  recoverMetaReviewGateFromSnapshot,
  type MetaReviewGateResult
} from "../../../core/bubble/metaReviewGate.js";

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

export interface BubbleMetaReviewHelpCommandOptions {
  help: true;
}

export type BubbleMetaReviewCommandOptions =
  | BubbleMetaReviewRunCommandOptions
  | BubbleMetaReviewStatusCommandOptions
  | BubbleMetaReviewLastReportCommandOptions
  | BubbleMetaReviewRecoverCommandOptions
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

export function getBubbleMetaReviewHelpText(): string {
  return [
    "Usage:",
    "  pairflow bubble meta-review run --id <id> [--repo <path>] [--depth standard|deep] [--json]",
    "  pairflow bubble meta-review status --id <id> [--repo <path>] [--json] [--verbose]",
    "  pairflow bubble meta-review last-report --id <id> [--repo <path>] [--json] [--verbose]",
    "  pairflow bubble meta-review recover --id <id> [--repo <path>] [--json]",
    "",
    "Options:",
    "  --id <id>             Bubble id",
    "  --repo <path>         Optional repository path (defaults to cwd ancestry lookup)",
    "  --depth <value>       run-only depth profile: standard|deep (default: standard)",
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
    subcommand !== "recover"
  ) {
    return invalidMetaReviewCliOptions(
      "Unknown meta-review subcommand. Use one of: run, status, last-report, recover."
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
    `Run id: ${result.run_id}`,
    `Updated: ${result.updated_at}`,
    `Lifecycle state: ${result.lifecycle_state}`,
    `Summary: ${result.summary ?? "-"}`,
    `Report ref: ${result.report_ref}`
  ];

  if (result.rework_target_message !== null) {
    lines.push(`Rework target: ${result.rework_target_message}`);
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

  if (verbose) {
    lines.push(`Last run id: ${view.last_autonomous_run_id ?? "-"}`);
    lines.push(`Last summary: ${view.last_autonomous_summary ?? "-"}`);
    lines.push(`Last report ref: ${view.last_autonomous_report_ref ?? "-"}`);
    lines.push(
      `Last rework target: ${view.last_autonomous_rework_target_message ?? "-"}`
    );
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
    `Updated: ${view.updated_at ?? "-"}`
  ];

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
