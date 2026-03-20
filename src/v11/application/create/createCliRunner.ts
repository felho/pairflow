import type {
  BubbleCreateResult,
  createBubble
} from "../../../core/bubble/createBubble.js";
import type { registerRepoInRegistry } from "../../../core/repo/registry.js";
import {
  buildCreateBubbleInput,
  registerRepoAfterCreateBestEffort,
  resolveBubbleCreateCommandDependencies
} from "./createCliRunHelpers.js";
import { parseBubbleCreateCommandOptions } from "./createCliOptions.js";

export interface BubbleCreateCommandDependencies {
  createBubble?: typeof createBubble;
  registerRepoInRegistry?: typeof registerRepoInRegistry;
  reportRegistryRegistrationWarning?:
    | ((message: string) => void)
    | undefined;
}

export async function runBubbleCreateCommand(
  args: string[],
  cwd: string = process.cwd(),
  dependencies: BubbleCreateCommandDependencies = {}
): Promise<BubbleCreateResult | null> {
  const options = parseBubbleCreateCommandOptions(args);
  if (options.help) {
    return null;
  }

  const resolvedDependencies = resolveBubbleCreateCommandDependencies(dependencies);
  const createInput = buildCreateBubbleInput(options, cwd);
  const created = await resolvedDependencies.create(createInput.input);
  await registerRepoAfterCreateBestEffort({
    repoPath: createInput.repoPath,
    register: resolvedDependencies.register,
    reportWarning: resolvedDependencies.reportWarning
  });
  return created;
}
