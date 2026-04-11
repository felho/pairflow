import { toMetaReviewErrorV11 as toMetaReviewError } from "./emitMetaReviewV11.js";
import {
  parseBubbleMetaReviewCommandOptions as parseBubbleMetaReviewCommandOptionsInternal,
  type BubbleMetaReviewCommandOptions
} from "./metaReviewCliOptions.js";
import { dispatchMetaReviewCommand } from "./metaReviewCliDispatcher.js";
import type { BubbleMetaReviewCommandResult } from "./metaReviewCliTypes.js";

export {
  getBubbleMetaReviewHelpText,
  parseBubbleMetaReviewCommandOptions,
} from "./metaReviewCliOptions.js";
export {
  renderMetaReviewLastReportText,
  renderMetaReviewStatusText,
  renderMetaReviewSubmitText
} from "./metaReviewCliRenderers.js";
export type {
  BubbleMetaReviewHelpCommandOptions,
  BubbleMetaReviewLastReportCommandOptions,
  BubbleMetaReviewStatusCommandOptions
} from "./metaReviewCliOptions.js";
export type { BubbleMetaReviewCommandResult } from "./metaReviewCliTypes.js";

export async function runBubbleMetaReviewCommand(
  args: string[] | BubbleMetaReviewCommandOptions,
  cwd: string = process.cwd()
): Promise<BubbleMetaReviewCommandResult | null> {
  try {
    const options =
      Array.isArray(args) ? parseBubbleMetaReviewCommandOptionsInternal(args) : args;
    if (options.help) {
      return null;
    }
    return await dispatchMetaReviewCommand({
      options,
      cwd
    });
  } catch (error) {
    throw toMetaReviewError(error);
  }
}
