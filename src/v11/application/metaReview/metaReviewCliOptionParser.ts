import {
  parseDepth,
  parseMetaReviewCliOptionValues,
} from "./metaReviewCliOptionValueReader.js";
import type { BubbleMetaReviewCommandOptions } from "./metaReviewCliOptionTypes.js";
import {
  assertRunOnlyDepthAllowed,
  assertSubmitOnlyOptionsAllowed,
  buildMetaReviewReadonlyCommandOptions,
  createMetaReviewBaseOptions,
  parseMetaReviewCliArgs,
  parseMetaReviewSubcommand
} from "./metaReviewCliOptionParserHelpers.js";

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

  assertSubmitOnlyOptionsAllowed(values);
  assertRunOnlyDepthAllowed(values.depth);
  return buildMetaReviewReadonlyCommandOptions(base, subcommand);
}
