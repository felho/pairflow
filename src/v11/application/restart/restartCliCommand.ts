import {
  asRestartBubbleErrorV11,
  restartBubbleV11,
  type RestartBubbleV11Result
} from "./emitRestartV11.js";
import {
  getBubbleRestartHelpTextV11,
  parseBubbleRestartCommandOptionsV11,
  type ParsedBubbleRestartCommandOptions
} from "../../shared/restart/restartCommandCliOptions.js";

export type {
  BubbleRestartCommandOptions,
  BubbleRestartHelpCommandOptions,
  ParsedBubbleRestartCommandOptions
} from "../../shared/restart/restartCommandCliOptions.js";

export interface BubbleRestartCommandDependencies {
  restartBubble?: typeof restartBubbleV11;
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
): Promise<RestartBubbleV11Result | null> {
  const options = parseBubbleRestartCommandOptions(args);
  if (options.help) {
    return null;
  }

  const runRestartBubble = dependencies.restartBubble ?? restartBubbleV11;
  try {
    return await runRestartBubble({
      bubbleId: options.id,
      repoPath: options.repo,
      cwd
    });
  } catch (error) {
    asRestartBubbleErrorV11(error);
  }
}
