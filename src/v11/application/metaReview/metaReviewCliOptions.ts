import { parseArgs } from "node:util";

import { MetaReviewErrorV11 as MetaReviewError, type MetaReviewDepthV11 as MetaReviewDepth } from "./emitMetaReviewV11.js";
import {
  parseDepth as parseDepthValue,
  parseOptionalReworkTarget as parseOptionalReworkTargetValue,
  parseRequiredSubmitText as parseRequiredSubmitTextValue,
  parseSubmitRecommendation as parseSubmitRecommendationValue,
  parseSubmitReportJson as parseSubmitReportJsonValue,
  parseSubmitRound as parseSubmitRoundValue,
  readBooleanOption as readBooleanOptionValue,
  readStringOption as readStringOptionValue
} from "./metaReviewCliValueParsers.js";
import type { MetaReviewSubmissionPayload } from "../../../types/protocol.js";

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

type MetaReviewSubcommand = "run" | "status" | "last-report" | "recover" | "submit";

interface ParsedMetaReviewOptionValues {
  id: string;
  repo: string | undefined;
  depth: string | undefined;
  round: string | undefined;
  recommendation: string | undefined;
  summary: string | undefined;
  reportMarkdown: string | undefined;
  reworkTargetMessage: string | undefined;
  reportJson: string | undefined;
  json: boolean;
  verbose: boolean;
}

function invalidMetaReviewCliOptions(message: string): never {
  throw new MetaReviewError(
    "META_REVIEW_SCHEMA_INVALID",
    `${message} context: command_name=meta-review.`
  );
}

function parseDepth(value: string | undefined): MetaReviewDepth {
  return parseDepthValue(value, invalidMetaReviewCliOptions);
}

function parseSubmitRound(value: string | undefined): number {
  return parseSubmitRoundValue(value, invalidMetaReviewCliOptions);
}

function parseSubmitRecommendation(
  value: string | undefined
): MetaReviewSubmissionPayload["recommendation"] {
  return parseSubmitRecommendationValue(
    value,
    invalidMetaReviewCliOptions
  );
}

function parseRequiredSubmitText(
  value: string | undefined,
  optionName: "--summary" | "--report-markdown"
): string {
  return parseRequiredSubmitTextValue(
    value,
    optionName,
    invalidMetaReviewCliOptions
  );
}

function parseOptionalReworkTarget(value: string | undefined): string | null {
  return parseOptionalReworkTargetValue(
    value,
    invalidMetaReviewCliOptions
  );
}

function parseSubmitReportJson(
  value: string | undefined
): Record<string, unknown> | undefined {
  return parseSubmitReportJsonValue(
    value,
    invalidMetaReviewCliOptions
  );
}

function readStringOption(
  values: Record<string, unknown>,
  key:
    | "id"
    | "repo"
    | "depth"
    | "round"
    | "recommendation"
    | "summary"
    | "report-markdown"
    | "rework-target-message"
    | "report-json",
  errorMessage: string
): string | undefined {
  return readStringOptionValue(
    values,
    key,
    errorMessage,
    invalidMetaReviewCliOptions
  );
}

function readBooleanOption(
  values: Record<string, unknown>,
  key: "json" | "verbose",
  errorMessage: string
): boolean | undefined {
  return readBooleanOptionValue(
    values,
    key,
    errorMessage,
    invalidMetaReviewCliOptions
  );
}

function parseMetaReviewCliOptionValues(
  values: Record<string, unknown>
): ParsedMetaReviewOptionValues {
  const id = readStringOption(values, "id", "Invalid --id value.");
  if (id === undefined) {
    return invalidMetaReviewCliOptions("Missing required option: --id");
  }
  if (id.trim().length === 0) {
    return invalidMetaReviewCliOptions("Invalid --id value. Must be non-empty.");
  }

  return {
    id,
    repo: readStringOption(values, "repo", "Invalid --repo value."),
    depth: readStringOption(values, "depth", "Invalid --depth value."),
    round: readStringOption(values, "round", "Invalid --round value."),
    recommendation: readStringOption(
      values,
      "recommendation",
      "Invalid --recommendation value."
    ),
    summary: readStringOption(values, "summary", "Invalid --summary value."),
    reportMarkdown: readStringOption(
      values,
      "report-markdown",
      "Invalid --report-markdown value."
    ),
    reworkTargetMessage: readStringOption(
      values,
      "rework-target-message",
      "Invalid --rework-target-message value."
    ),
    reportJson: readStringOption(values, "report-json", "Invalid --report-json value."),
    json: readBooleanOption(values, "json", "Invalid --json value.") ?? false,
    verbose: readBooleanOption(values, "verbose", "Invalid --verbose value.") ?? false
  };
}

function parseMetaReviewSubcommand(value: string | undefined): MetaReviewSubcommand | null {
  if (value === undefined) {
    return null;
  }
  if (
    value === "run" ||
    value === "status" ||
    value === "last-report" ||
    value === "recover" ||
    value === "submit"
  ) {
    return value;
  }
  return invalidMetaReviewCliOptions(
    "Unknown meta-review subcommand. Use one of: run, status, last-report, recover, submit."
  );
}

function parseMetaReviewCliArgs(args: string[]): ReturnType<typeof parseArgs> {
  try {
    return parseArgs({
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
}

function createMetaReviewBaseOptions(
  values: ParsedMetaReviewOptionValues
): BubbleMetaReviewCommandBase {
  return {
    id: values.id,
    ...(values.repo !== undefined ? { repo: values.repo } : {}),
    json: values.json,
    verbose: values.verbose,
    help: false
  };
}

function hasSubmitOnlyOptions(values: ParsedMetaReviewOptionValues): boolean {
  return (
    values.round !== undefined ||
    values.recommendation !== undefined ||
    values.summary !== undefined ||
    values.reportMarkdown !== undefined ||
    values.reworkTargetMessage !== undefined ||
    values.reportJson !== undefined
  );
}

function assertSubmitOnlyOptionsAllowed(
  values: ParsedMetaReviewOptionValues
): void {
  if (hasSubmitOnlyOptions(values)) {
    invalidMetaReviewCliOptions(
      "--round/--recommendation/--summary/--report-markdown/--rework-target-message/--report-json are only supported for meta-review submit."
    );
  }
}

function assertRunOnlyDepthAllowed(depth: string | undefined): void {
  if (depth !== undefined) {
    invalidMetaReviewCliOptions(
      "--depth is only supported for meta-review run."
    );
  }
}

function buildMetaReviewSubmitOptions(
  base: BubbleMetaReviewCommandBase,
  values: ParsedMetaReviewOptionValues
): BubbleMetaReviewSubmitCommandOptions {
  if (values.depth !== undefined) {
    invalidMetaReviewCliOptions(
      "--depth is only supported for meta-review run."
    );
  }
  const parsedReportJson = parseSubmitReportJson(values.reportJson);
  return {
    ...base,
    command: "submit",
    round: parseSubmitRound(values.round),
    recommendation: parseSubmitRecommendation(values.recommendation),
    summary: parseRequiredSubmitText(values.summary, "--summary"),
    reportMarkdown: parseRequiredSubmitText(
      values.reportMarkdown,
      "--report-markdown"
    ),
    reworkTargetMessage: parseOptionalReworkTarget(values.reworkTargetMessage),
    ...(parsedReportJson !== undefined ? { reportJson: parsedReportJson } : {})
  };
}

function buildMetaReviewReadonlyCommandOptions(
  base: BubbleMetaReviewCommandBase,
  subcommand: Exclude<MetaReviewSubcommand, "run" | "submit">
): BubbleMetaReviewStatusCommandOptions
  | BubbleMetaReviewLastReportCommandOptions
  | BubbleMetaReviewRecoverCommandOptions {
  return {
    ...base,
    command: subcommand
  };
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
  const parsed = parseMetaReviewCliArgs(args);
  if (parsed.values.help ?? false) {
    return { help: true };
  }

  const subcommand = parseMetaReviewSubcommand(parsed.positionals[0]);
  if (subcommand === null) {
    return { help: true };
  }

  const values = parseMetaReviewCliOptionValues(
    parsed.values as Record<string, unknown>
  );
  const base = createMetaReviewBaseOptions(values);
  if (subcommand === "run") {
    return {
      ...base,
      command: "run",
      depth: parseDepth(values.depth)
    };
  }
  if (subcommand === "submit") {
    return buildMetaReviewSubmitOptions(base, values);
  }

  assertSubmitOnlyOptionsAllowed(values);
  assertRunOnlyDepthAllowed(values.depth);
  return buildMetaReviewReadonlyCommandOptions(base, subcommand);
}
