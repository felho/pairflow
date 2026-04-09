import type { RegisterRepoInRegistryPort } from "../../shared/ports/repoRegistry.js";
import {
  buildCreateBubbleInput,
  registerRepoAfterCreateBestEffort,
  resolveBubbleCreateCommandDependencies
} from "./createCliRunHelpers.js";
import type {
  BubbleCreateResult,
  CreateBubbleImplementation
} from "./createCommandContract.js";
import { parseBubbleCreateCommandOptions } from "./createCliOptions.js";

export interface BubbleCreateCommandDependencies {
  createBubble?: CreateBubbleImplementation;
  registerRepoInRegistry?: RegisterRepoInRegistryPort;
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
    ...(resolvedDependencies.register !== undefined
      ? { register: resolvedDependencies.register }
      : {}),
    reportWarning: resolvedDependencies.reportWarning
  });
  return created;
}
