import { restartBubbleDependencyDefaults } from "../../../v11/defaults/restart/restartCommandDefaults.js";
import {
  restartBubble
} from "../../../v11/application/restart/restartCommandApi.js";
import {
  runBubbleRestartCommand as runApplicationBubbleRestartCommand,
  type BubbleRestartCommandDependencies
} from "../../../v11/application/restart/restartCliCommand.js";

export {
  getBubbleRestartHelpText,
  parseBubbleRestartCommandOptions
} from "../../../v11/application/restart/restartCliCommand.js";
export type {
  BubbleRestartCommandDependencies,
  BubbleRestartCommandOptions,
  BubbleRestartHelpCommandOptions,
  ParsedBubbleRestartCommandOptions
} from "../../../v11/application/restart/restartCliCommand.js";

export async function runBubbleRestartCommand(
  args: string[],
  cwd: string = process.cwd(),
  dependencies: BubbleRestartCommandDependencies = {}
) {
  return runApplicationBubbleRestartCommand(args, cwd, {
    restartBubble:
      dependencies.restartBubble ??
      ((input, inputDependencies = {}) =>
        restartBubble(input, {
          ...restartBubbleDependencyDefaults,
          ...inputDependencies
        }))
  });
}
