import {
  parseMetaReviewCliOptionValues,
} from "./metaReviewCliOptionValueReader.js";
import type { BubbleMetaReviewCommandOptions } from "./metaReviewCliOptionTypes.js";
import {
  assertDepthOptionRemoved,
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
  const subcommand = parseMetaReviewSubcommand(parsed.positionals[0]);
  if (parsed.values.help ?? false) {
    return { help: true };
  }
  if (subcommand === null) {
    return { help: true };
  }

  const values = parseMetaReviewCliOptionValues(
    parsed.values as Record<string, unknown>
  );
  const base = createMetaReviewBaseOptions(values);
  assertSubmitOnlyOptionsAllowed(values);
  assertDepthOptionRemoved(values.depth);
  return buildMetaReviewReadonlyCommandOptions(base, subcommand);
}
