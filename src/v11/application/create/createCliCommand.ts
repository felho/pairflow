import {
  getBubbleCreateHelpText,
  parseBubbleCreateCommandOptions
} from "./createCliOptions.js";
import {
  runBubbleCreateCommand as runBubbleCreateCommandRuntime,
  type BubbleCreateCommandDependencies
} from "./createCliRunner.js";
import type { RegisterRepoInRegistryPort } from "../../shared/ports/repoRegistry.js";

export {
  getBubbleCreateHelpText,
  parseBubbleCreateCommandOptions
};
export type { BubbleCreateCommandOptions } from "./createCliOptions.js";
export type { BubbleCreateCommandDependencies };

let repoRegistryDefaultsModulePromise:
  | Promise<{
      registerRepoInRegistry: RegisterRepoInRegistryPort;
    }>
  | undefined;

function getRepoRegistryDefaultsModulePath(): string {
  return [
    "..",
    "..",
    "defaults",
    "repoRegistry",
    "repoRegistryDefaults.js"
  ].join("/");
}

async function loadRepoRegistryDefaultsModule(): Promise<{
  registerRepoInRegistry: RegisterRepoInRegistryPort;
}> {
  repoRegistryDefaultsModulePromise ??= import(
    getRepoRegistryDefaultsModulePath()
  ) as Promise<{
    registerRepoInRegistry: RegisterRepoInRegistryPort;
  }>;
  return repoRegistryDefaultsModulePromise;
}

const registerRepoInRegistry: RegisterRepoInRegistryPort = async (input) => {
  const module = await loadRepoRegistryDefaultsModule();
  return module.registerRepoInRegistry(input);
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
