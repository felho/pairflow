import {
  asBubbleStatusError,
  getBubbleStatus,
  type BubbleStatusView
} from "./statusCommandApi.js";
import type { BubbleStatusDependencies } from "./statusCommandContract.js";
import {
  parseBubbleStatusCommandOptions,
  type BubbleStatusCommandOptions
} from "./statusCliOptions.js";

export async function runBubbleStatusCommand(
  args: string[] | BubbleStatusCommandOptions,
  cwd: string = process.cwd(),
  dependencies: BubbleStatusDependencies
): Promise<BubbleStatusView | null> {
  const options =
    Array.isArray(args) ? parseBubbleStatusCommandOptions(args) : args;
  if (options.help) {
    return null;
  }

  try {
    return await getBubbleStatus({
      bubbleId: options.id,
      repoPath: options.repo,
      cwd
    }, dependencies);
  } catch (error) {
    asBubbleStatusError(error);
  }
}
