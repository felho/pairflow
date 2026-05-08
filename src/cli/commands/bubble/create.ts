import {
  getBubbleCreateHelpText,
  parseBubbleCreateCommandOptions
} from "./createCliOptions.js";
import {
  runBubbleCreateCommand as runBubbleCreateCommandRuntime,
  type BubbleCreateCommandDependencies
} from "./createCliRunner.js";
import { registerRepoInRegistry as defaultRegisterRepoInRegistry } from "../../../v11/defaults/repoRegistry/repoRegistryDefaults.js";
import type { RegisterRepoInRegistryPort } from "../../../v11/ports/repoRegistry.js";

export {
  getBubbleCreateHelpText,
  parseBubbleCreateCommandOptions
};
export type { BubbleCreateCommandOptions } from "./createCliOptions.js";
export type { BubbleCreateCommandDependencies };

const registerRepoInRegistry: RegisterRepoInRegistryPort = async (input) => {
  return defaultRegisterRepoInRegistry(input);
};

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
