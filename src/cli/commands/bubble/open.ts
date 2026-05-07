import { processSpawnDefault } from "../../../v11/defaults/process/processSpawnDefaults.js";
import {
  runBubbleOpenCommand as runApplicationBubbleOpenCommand,
  type BubbleOpenCommandDependencies
} from "../../../v11/application/open/openCliCommand.js";

export {
  formatBubbleOpenResultText,
  getBubbleOpenHelpText,
  parseBubbleOpenCommandOptions
} from "../../../v11/application/open/openCliCommand.js";
export type {
  BubbleOpenCommandDependencies,
  BubbleOpenCommandOptions,
  BubbleOpenHelpCommandOptions,
  ParsedBubbleOpenCommandOptions
} from "../../../v11/application/open/openCliCommand.js";

export async function runBubbleOpenCommand(
  args: string[],
  cwd: string = process.cwd(),
  dependencies: BubbleOpenCommandDependencies = {}
) {
  return runApplicationBubbleOpenCommand(args, cwd, {
    processSpawn: dependencies.processSpawn ?? processSpawnDefault,
    ...dependencies
  });
}
