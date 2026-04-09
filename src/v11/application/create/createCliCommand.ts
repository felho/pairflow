import { registerRepoInRegistry } from "../../defaults/repoRegistry/repoRegistryDefaults.js";
import {
  getBubbleCreateHelpText,
  parseBubbleCreateCommandOptions
} from "./createCliOptions.js";
import {
  runBubbleCreateCommand as runBubbleCreateCommandRuntime,
  type BubbleCreateCommandDependencies
} from "./createCliRunner.js";

export {
  getBubbleCreateHelpText,
  parseBubbleCreateCommandOptions
};
export type { BubbleCreateCommandOptions } from "./createCliOptions.js";
export type { BubbleCreateCommandDependencies };

export async function runBubbleCreateCommand(
  args: string[],
  cwd: string = process.cwd(),
  dependencies: BubbleCreateCommandDependencies = {}
) {
  return runBubbleCreateCommandRuntime(args, cwd, {
    registerRepoInRegistry:
      dependencies.registerRepoInRegistry
      ?? registerRepoInRegistry,
    ...dependencies
  });
}
