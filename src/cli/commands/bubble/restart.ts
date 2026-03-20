import {
  asRestartBubbleError,
  restartBubble,
  type RestartBubbleResult
} from "../../../core/bubble/restartBubble.js";
import {
  getBubbleRestartHelpTextV11,
  parseBubbleRestartCommandOptionsV11,
  type ParsedBubbleRestartCommandOptions
} from "../../../v11/shared/restart/restartCommandCliOptions.js";

export type {
  BubbleRestartCommandOptions,
  BubbleRestartHelpCommandOptions
} from "../../../v11/shared/restart/restartCommandCliOptions.js";

export interface BubbleRestartCommandDependencies {
  restartBubble?: typeof restartBubble;
}

export function getBubbleRestartHelpText(): string {
  return getBubbleRestartHelpTextV11();
}

export function parseBubbleRestartCommandOptions(
  args: string[]
): ParsedBubbleRestartCommandOptions {
  return parseBubbleRestartCommandOptionsV11(args);
}

export async function runBubbleRestartCommand(
  args: string[],
  cwd: string = process.cwd(),
  dependencies: BubbleRestartCommandDependencies = {}
): Promise<RestartBubbleResult | null> {
  const options = parseBubbleRestartCommandOptions(args);
  if (options.help) {
    return null;
  }

  const runRestartBubble = dependencies.restartBubble ?? restartBubble;
  try {
    return await runRestartBubble({
      bubbleId: options.id,
      repoPath: options.repo,
      cwd
    });
  } catch (error) {
    asRestartBubbleError(error);
  }
}
