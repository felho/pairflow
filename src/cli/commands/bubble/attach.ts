import { processSpawnDefault } from "../../../v11/defaults/process/processSpawnDefaults.js";
import {
  runBubbleAttachCommand as runApplicationBubbleAttachCommand,
  type BubbleAttachCommandDependencies
} from "../../../v11/application/attach/attachCliCommand.js";

export {
  getBubbleAttachHelpText,
  parseBubbleAttachCommandOptions
} from "../../../v11/application/attach/attachCliCommand.js";
export type {
  BubbleAttachCommandDependencies,
  BubbleAttachCommandOptions,
  BubbleAttachHelpCommandOptions,
  ParsedBubbleAttachCommandOptions
} from "../../../v11/application/attach/attachCliCommand.js";

export async function runBubbleAttachCommand(
  args: string[],
  cwd: string = process.cwd(),
  dependencies: BubbleAttachCommandDependencies = {}
) {
  return runApplicationBubbleAttachCommand(args, cwd, {
    processSpawn: dependencies.processSpawn ?? processSpawnDefault,
    ...dependencies
  });
}
