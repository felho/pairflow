import {
  asRestartBubbleError,
  restartBubble,
  type RestartBubbleResult
} from "./restartCommandApi.js";
import {
  getBubbleRestartHelpText,
  parseBubbleRestartCommandOptions
} from "./internal/cli/restartCommandCliOptions.js";

export {
  getBubbleRestartHelpText,
  parseBubbleRestartCommandOptions
};
export type {
  BubbleRestartCommandOptions,
  BubbleRestartHelpCommandOptions,
  ParsedBubbleRestartCommandOptions
} from "./internal/cli/restartCommandCliOptions.js";

export interface BubbleRestartCommandDependencies {
  restartBubble?: typeof restartBubble;
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
