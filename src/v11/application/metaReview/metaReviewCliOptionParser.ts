import {
  invalidMetaReviewCliOptionsWithContext as invalidMetaReviewCliOptions,
  parseDepth,
  parseMetaReviewCliOptionValues,
  parseOptionalReworkTarget,
  parseRequiredSubmitReportJson,
  parseRequiredSubmitText,
  parseSubmitRecommendation,
  parseSubmitRound,
  type ParsedMetaReviewOptionValues,
} from "./metaReviewCliOptionValueReader.js";
import type {
  BubbleMetaReviewCommandOptions,
  BubbleMetaReviewSubmitCommandOptions
} from "./metaReviewCliOptionTypes.js";
import {
  assertRunOnlyDepthAllowed,
  assertSubmitOnlyOptionsAllowed,
  buildMetaReviewReadonlyCommandOptions,
  createMetaReviewBaseOptions,
  parseMetaReviewCliArgs,
  parseMetaReviewSubcommand,
  type BubbleMetaReviewBaseOptions
} from "./metaReviewCliOptionParserHelpers.js";

function buildMetaReviewSubmitOptions(
  base: BubbleMetaReviewBaseOptions,
  values: ParsedMetaReviewOptionValues
): BubbleMetaReviewSubmitCommandOptions {
  if (values.depth !== undefined) {
    invalidMetaReviewCliOptions(
      "--depth is only supported for meta-review run."
    );
  }
  return {
    ...base,
    command: "submit",
    round: parseSubmitRound(values.round),
    recommendation: parseSubmitRecommendation(values.recommendation),
    summary: parseRequiredSubmitText(values.summary, "--summary"),
    reworkTargetMessage: parseOptionalReworkTarget(values.reworkTargetMessage),
    reportJson: parseRequiredSubmitReportJson(values.reportJson)
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
