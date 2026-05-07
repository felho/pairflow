import { resolve } from "node:path";

import { DEPENDENCY_FAIL_REPO_REGISTRY_REGISTER } from "../../../config/bubbleConfig.js";
import type { CreateReviewArtifactType } from "../../../types/bubble.js";
import { createBubble } from "../../../v11/defaults/create/createBubbleApi.js";
import type {
  BubbleCreateInput,
  CreateBubbleImplementation
} from "../../../v11/application/create/createCommandContract.js";
import type { RegisterRepoInRegistryPort } from "../../../v11/shared/ports/repoRegistry.js";

export interface BubbleCreateCommandRuntimeOptions {
  id?: string;
  repo?: string;
  base?: string;
  reviewArtifactType?: CreateReviewArtifactType;
  ideation?: boolean;
  task?: string;
  taskFile?: string;
  reviewerBrief?: string;
  reviewerBriefFile?: string;
  bootstrapCommand?: string;
  validationTarget?: string;
  pairflowCommandProfile?: BubbleCreateInput["pairflowCommandProfile"];
  accuracyCritical?: boolean;
  remote?: string;
}

export interface BubbleCreateCommandRuntimeDependencies {
  createBubble?: CreateBubbleImplementation;
  registerRepoInRegistry?: RegisterRepoInRegistryPort;
  reportRegistryRegistrationWarning?:
    | ((message: string) => void)
    | undefined;
}

interface ResolvedBubbleCreateCommandDependencies {
  create: CreateBubbleImplementation;
  register?: RegisterRepoInRegistryPort;
  reportWarning: (message: string) => void;
}

export function resolveBubbleCreateCommandDependencies(
  dependencies: BubbleCreateCommandRuntimeDependencies
): ResolvedBubbleCreateCommandDependencies {
  const register = dependencies.registerRepoInRegistry;
  return {
    create: dependencies.createBubble ?? createBubble,
    ...(register !== undefined ? { register } : {}),
    reportWarning:
      dependencies.reportRegistryRegistrationWarning ??
      ((message: string) => {
        process.stderr.write(`${message}\n`);
      })
  };
}

export function buildCreateBubbleInput(
  options: BubbleCreateCommandRuntimeOptions,
  cwd: string
): {
  repoPath: string;
  input: BubbleCreateInput;
} {
  const repoPath = resolve(cwd, options.repo as string);
  const input: BubbleCreateInput = {
    id: options.id as string,
    repoPath,
    reviewArtifactType: options.reviewArtifactType as CreateReviewArtifactType,
    ...(options.base !== undefined ? { baseBranch: options.base } : {}),
    ...(options.ideation === true ? { ideation: true } : {}),
    ...(options.task !== undefined ? { task: options.task } : {}),
    ...(options.taskFile !== undefined ? { taskFile: options.taskFile } : {}),
    ...(options.reviewerBrief !== undefined
      ? { reviewerBrief: options.reviewerBrief }
      : {}),
    ...(options.reviewerBriefFile !== undefined
      ? { reviewerBriefFile: options.reviewerBriefFile }
      : {}),
    ...(options.bootstrapCommand !== undefined
      ? { bootstrapCommand: options.bootstrapCommand }
      : {}),
    ...(options.validationTarget !== undefined
      ? { validationTarget: options.validationTarget }
      : {}),
    ...(options.pairflowCommandProfile !== undefined
      ? { pairflowCommandProfile: options.pairflowCommandProfile }
      : {}),
    ...(options.accuracyCritical === true ? { accuracyCritical: true } : {}),
    ...(options.remote !== undefined ? { remote: options.remote } : {}),
    cwd
  };
  return {
    repoPath,
    input
  };
}

export async function registerRepoAfterCreateBestEffort(input: {
  repoPath: string;
  register?: RegisterRepoInRegistryPort;
  reportWarning: (message: string) => void;
}): Promise<void> {
  if (input.register === undefined) {
    return;
  }

  try {
    await input.register({
      repoPath: input.repoPath
    });
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    input.reportWarning(
      `${DEPENDENCY_FAIL_REPO_REGISTRY_REGISTER}: failed to auto-register repository for bubble create (${input.repoPath}): ${reason}`
    );
  }
}
