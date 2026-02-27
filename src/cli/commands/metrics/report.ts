import { resolve } from "node:path";
import { parseArgs } from "node:util";

import { normalizeRepoPath } from "../../../core/bubble/repoResolution.js";
import {
  formatMetricsReportJson,
  formatMetricsReportTable
} from "../../../core/metrics/report/format.js";
import {
  MetricsReportError,
  generateMetricsReport
} from "../../../core/metrics/report/report.js";
import { MetricsReportDateRangeError } from "../../../core/metrics/report/selectShards.js";
import type {
  MetricsReportFormat,
  MetricsReportResult
} from "../../../core/metrics/report/types.js";
import { isIsoTimestamp } from "../../../core/validation.js";

export interface MetricsReportCommandOptions {
  from: Date;
  to: Date;
  repo?: string;
  format: MetricsReportFormat;
  help: false;
}

export interface MetricsReportHelpCommandOptions {
  help: true;
}

export type ParsedMetricsReportCommandOptions =
  | MetricsReportCommandOptions
  | MetricsReportHelpCommandOptions;

export interface MetricsReportCommandResult {
  format: MetricsReportFormat;
  report: MetricsReportResult;
  output: string;
}

export interface RunMetricsReportCommandInput {
  cwd?: string;
  metricsRootPath?: string;
  archiveRootPath?: string;
}

export class MetricsReportCommandError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "MetricsReportCommandError";
  }
}

function parseDateBoundary(value: string, boundary: "from" | "to"): Date {
  const dateOnlyMatch = /^(\d{4})-(\d{2})-(\d{2})$/u.exec(value);
  if (dateOnlyMatch !== null) {
    const year = Number.parseInt(value.slice(0, 4), 10);
    const month = Number.parseInt(value.slice(5, 7), 10);
    const day = Number.parseInt(value.slice(8, 10), 10);
    const parsed = new Date(
      Date.UTC(
        year,
        month - 1,
        day,
        boundary === "from" ? 0 : 23,
        boundary === "from" ? 0 : 59,
        boundary === "from" ? 0 : 59,
        boundary === "from" ? 0 : 999
      )
    );
    if (
      Number.isNaN(parsed.getTime()) ||
      parsed.getUTCFullYear() !== year ||
      parsed.getUTCMonth() + 1 !== month ||
      parsed.getUTCDate() !== day
    ) {
      throw new MetricsReportCommandError(
        `Invalid --${boundary} date value: ${value}`
      );
    }

    return parsed;
  }

  const valueIsIsoTimestamp = isIsoTimestamp(value as unknown);
  if (!valueIsIsoTimestamp) {
    throw new MetricsReportCommandError(
      `Invalid --${boundary} date value: ${value}. Use YYYY-MM-DD or ISO UTC timestamp.`
    );
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new MetricsReportCommandError(
      `Invalid --${boundary} date value: ${value}`
    );
  }
  return parsed;
}

function parseFormat(value: string | undefined): MetricsReportFormat {
  if (value === undefined || value === "table") {
    return "table";
  }
  if (value === "json") {
    return "json";
  }
  throw new MetricsReportCommandError(
    "Invalid --format value. Use one of: table, json."
  );
}

export function getMetricsReportHelpText(): string {
  return [
    "Usage:",
    "  pairflow metrics report --from <date> --to <date> [--repo <path>] [--format table|json]",
    "",
    "Options:",
    "  --from <date>         Required range start (YYYY-MM-DD or ISO UTC timestamp)",
    "  --to <date>           Required range end (YYYY-MM-DD or ISO UTC timestamp)",
    "  --repo <path>         Optional repository path filter (exact normalized match)",
    "  --format <value>      Output format: table|json (default: table)",
    "  -h, --help            Show this help"
  ].join("\n");
}

export function parseMetricsReportCommandOptions(
  args: string[]
): ParsedMetricsReportCommandOptions {
  let parsed;
  try {
    parsed = parseArgs({
      args,
      options: {
        from: {
          type: "string"
        },
        to: {
          type: "string"
        },
        repo: {
          type: "string"
        },
        format: {
          type: "string"
        },
        help: {
          type: "boolean",
          short: "h"
        }
      },
      strict: true,
      allowPositionals: false
    });
  } catch (error) {
    if (error instanceof TypeError) {
      throw new MetricsReportCommandError(error.message);
    }
    throw error;
  }

  if (parsed.values.help ?? false) {
    return {
      help: true
    };
  }

  if (parsed.values.from === undefined) {
    throw new MetricsReportCommandError("Missing required option: --from");
  }
  if (parsed.values.to === undefined) {
    throw new MetricsReportCommandError("Missing required option: --to");
  }

  const from = parseDateBoundary(parsed.values.from, "from");
  const to = parseDateBoundary(parsed.values.to, "to");
  if (from.getTime() > to.getTime()) {
    throw new MetricsReportCommandError("Invalid date range: --from must be <= --to.");
  }

  const format = parseFormat(parsed.values.format);

  return {
    from,
    to,
    ...(parsed.values.repo !== undefined ? { repo: parsed.values.repo } : {}),
    format,
    help: false
  };
}

export async function runMetricsReportCommand(
  args: string[] | MetricsReportCommandOptions,
  input: RunMetricsReportCommandInput = {}
): Promise<MetricsReportCommandResult | null> {
  try {
    const options = Array.isArray(args)
      ? parseMetricsReportCommandOptions(args)
      : args;
    if (options.help) {
      return null;
    }

    const cwd = input.cwd ?? process.cwd();
    const normalizedRepoPath =
      options.repo === undefined
        ? undefined
        : await normalizeRepoPath(resolve(cwd, options.repo));

    const report = await generateMetricsReport({
      from: options.from,
      to: options.to,
      ...(normalizedRepoPath !== undefined
        ? { repoPath: normalizedRepoPath }
        : {}),
      ...(input.metricsRootPath !== undefined
        ? { metricsRootPath: input.metricsRootPath }
        : {}),
      ...(input.archiveRootPath !== undefined
        ? { archiveRootPath: input.archiveRootPath }
        : {})
    });

    return {
      format: options.format,
      report,
      output:
        options.format === "json"
          ? formatMetricsReportJson(report)
          : formatMetricsReportTable(report)
    };
  } catch (error) {
    if (
      error instanceof MetricsReportError ||
      error instanceof MetricsReportDateRangeError
    ) {
      throw new MetricsReportCommandError(error.message);
    }
    throw error;
  }
}
