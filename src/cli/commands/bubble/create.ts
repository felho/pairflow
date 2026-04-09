import { registerRepoInRegistry } from "../../../v11/infrastructure/executor/workspace/repoRegistry.js";
import {
  getBubbleCreateHelpText,
  parseBubbleCreateCommandOptions
} from "../../../v11/application/create/createCliOptions.js";
import {
  runBubbleCreateCommand as runBubbleCreateCommandRuntime,
  type BubbleCreateCommandDependencies
} from "../../../v11/application/create/createCliRunner.js";

export {
  getBubbleCreateHelpText,
  parseBubbleCreateCommandOptions
};

export type { BubbleCreateCommandOptions } from "../../../v11/application/create/createCliOptions.js";
export type { BubbleCreateCommandDependencies };

export async function runBubbleCreateCommand(
  args: string[],
  cwd: string = process.cwd(),
  dependencies: BubbleCreateCommandDependencies = {}
) {
  return runBubbleCreateCommandRuntime(args, cwd, {
    registerRepoInRegistry:
      dependencies.registerRepoInRegistry ?? registerRepoInRegistry,
    ...dependencies
  });
}
