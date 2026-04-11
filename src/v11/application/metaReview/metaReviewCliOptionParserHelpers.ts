import { parseArgs } from "node:util";

import {
  invalidMetaReviewCliOptionsWithContext as invalidMetaReviewCliOptions,
  type ParsedMetaReviewOptionValues
} from "./metaReviewCliOptionValueReader.js";
import type {
  BubbleMetaReviewLastReportCommandOptions,
  BubbleMetaReviewRecoverCommandOptions,
  BubbleMetaReviewStatusCommandOptions
} from "./metaReviewCliOptionTypes.js";

export type MetaReviewSubcommand = "status" | "last-report" | "recover";

export type BubbleMetaReviewBaseOptions = {
  id: string;
  repo?: string;
  json: boolean;
  verbose: boolean;
  help: false;
};

export function parseMetaReviewSubcommand(
  value: string | undefined
): MetaReviewSubcommand | null {
  if (value === undefined) {
    return null;
  }
  if (value === "submit") {
    return invalidMetaReviewCliOptions(
      "Legacy `pairflow bubble meta-review submit` was removed. Use canonical `pairflow agent emit --kind meta_review_result ...` instead."
    );
  }
  if (value === "run") {
    return invalidMetaReviewCliOptions(
      "`pairflow bubble meta-review run` was removed. Use canonical `pairflow agent emit --kind meta_review_result ...` for actor writes. Retained operator commands: status, last-report, recover (fail-closed/unsupported)."
    );
  }
  if (
    value === "status" ||
    value === "last-report" ||
    value === "recover"
  ) {
    return value;
  }
  return invalidMetaReviewCliOptions(
    "Unknown meta-review subcommand. Use one of: status, last-report, recover."
  );
}

export function parseMetaReviewCliArgs(args: string[]): ReturnType<typeof parseArgs> {
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

export function createMetaReviewBaseOptions(
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
    values.reworkTargetMessage !== undefined ||
    values.reportJson !== undefined
  );
}

export function assertSubmitOnlyOptionsAllowed(
  values: ParsedMetaReviewOptionValues
): void {
  if (hasSubmitOnlyOptions(values)) {
    invalidMetaReviewCliOptions(
      "--round/--recommendation/--summary/--rework-target-message/--report-json are only supported for canonical `pairflow agent emit --kind meta_review_result`."
    );
  }
}

export function assertDepthOptionRemoved(depth: string | undefined): void {
  if (depth !== undefined) {
    invalidMetaReviewCliOptions(
      "`--depth` is no longer supported because `pairflow bubble meta-review run` was removed. Retained operator commands: status, last-report, recover (fail-closed/unsupported)."
    );
  }
}

export function buildMetaReviewReadonlyCommandOptions(
  base: BubbleMetaReviewBaseOptions,
  subcommand: MetaReviewSubcommand
): BubbleMetaReviewStatusCommandOptions
  | BubbleMetaReviewLastReportCommandOptions
  | BubbleMetaReviewRecoverCommandOptions {
  return {
    ...base,
    command: subcommand
  };
}
