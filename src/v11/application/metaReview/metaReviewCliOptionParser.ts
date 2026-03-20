import { parseArgs } from "node:util";

import {
  invalidMetaReviewCliOptionsWithContext as invalidMetaReviewCliOptions,
  parseDepth,
  parseMetaReviewCliOptionValues,
  parseOptionalReworkTarget,
  parseRequiredSubmitText,
  parseSubmitRecommendation,
  parseSubmitReportJson,
  parseSubmitRound,
  type ParsedMetaReviewOptionValues
} from "./metaReviewCliOptionValueReader.js";
import type {
  BubbleMetaReviewCommandOptions,
  BubbleMetaReviewLastReportCommandOptions,
  BubbleMetaReviewRecoverCommandOptions,
  BubbleMetaReviewStatusCommandOptions,
  BubbleMetaReviewSubmitCommandOptions
} from "./metaReviewCliOptionTypes.js";

type MetaReviewSubcommand = "run" | "status" | "last-report" | "recover" | "submit";

type BubbleMetaReviewBaseOptions = {
  id: string;
  repo?: string;
  json: boolean;
  verbose: boolean;
  help: false;
};

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
): BubbleMetaReviewBaseOptions {
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
  base: BubbleMetaReviewBaseOptions,
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
  base: BubbleMetaReviewBaseOptions,
  subcommand: Exclude<MetaReviewSubcommand, "run" | "submit">
): BubbleMetaReviewStatusCommandOptions
  | BubbleMetaReviewLastReportCommandOptions
  | BubbleMetaReviewRecoverCommandOptions {
  return {
    ...base,
    command: subcommand
  };
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
