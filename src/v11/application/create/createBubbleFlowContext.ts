import { resolve } from "node:path";

import { loadPairflowGlobalConfig } from "../../../config/pairflowConfig.js";
import { getBubblePaths, type BubblePaths } from "../../shared/bubble/bubblePaths.js";
import type { ReviewerFocusExtractionResult } from "../../../v11/shared/reviewer/reviewerBrief.js";
import { createInitialBubbleState } from "../../domain/state/initialState.js";
import {
  assertValidBubbleStateSnapshot
} from "../../shared/state/stateSchema.js";
import { SchemaValidationError } from "../../shared/validation/primitives.js";
import type {
  BubbleRemotePointerCreated,
  BubbleConfig,
  BubbleStateSnapshot
} from "../../../types/bubble.js";
import type {
  BubbleCreateDependencies,
  BubbleCreateInput,
  ResolvedTaskInput
} from "./createCommandContract.js";
import {
  BubbleCreateError,
  buildBubbleConfig,
  buildIdeationPlaceholderTaskContent,
  ensureBubbleDoesNotExist,
  ensureRepoPathIsGitRepo,
  resolveCreateRemoteAlias,
  resolveCreateReviewArtifactType,
  resolveReviewerBriefInput,
  resolveTaskInput,
  validateBubbleId
} from "./createCommandRuntime.js";
import {
  prepareCreateBubbleInput,
  type PreparedCreateBubbleInput
} from "./createBubblePreparation.js";
import { extractReviewerFocus } from "./createReviewerFocus.js";

export interface CreateBubbleFlowContext {
  repoPath: string;
  paths: BubblePaths;
  task: ResolvedTaskInput;
  reviewerFocus: ReviewerFocusExtractionResult;
  reviewerBrief?: ResolvedTaskInput | undefined;
  remotePointer?: BubbleRemotePointerCreated;
  prepared: PreparedCreateBubbleInput;
  config: BubbleConfig;
  state: BubbleStateSnapshot;
}

export async function prepareCreateBubbleFlowContext(input: {
  command: BubbleCreateInput;
  createdAt: Date;
  dependencies: BubbleCreateDependencies;
}): Promise<CreateBubbleFlowContext> {
  validateBubbleId(input.command.id);
  const reviewArtifactType = resolveCreateReviewArtifactType(
    input.command.reviewArtifactType
  );

  const repoPath = resolve(input.command.repoPath);
  if (input.dependencies.assertGitRepository === undefined) {
    throw new BubbleCreateError(
      "Missing required create bubble dependency: assertGitRepository."
    );
  }
  await ensureRepoPathIsGitRepo(
    repoPath,
    input.dependencies.assertGitRepository
  );

  const baseBranch = input.command.baseBranch.trim();
  if (baseBranch.length === 0) {
    throw new BubbleCreateError("Base branch cannot be empty.");
  }

  const paths = getBubblePaths(repoPath, input.command.id);
  await ensureBubbleDoesNotExist(paths.bubbleDir);

  const ideationMode = input.command.ideation === true;
  const task = ideationMode
    ? {
        content: buildIdeationPlaceholderTaskContent(input.command.id),
        source: "ideation_placeholder" as const
      }
    : await resolveTaskInput({
        cwd: input.command.cwd ?? process.cwd(),
        ...(input.command.task !== undefined ? { task: input.command.task } : {}),
        ...(input.command.taskFile !== undefined
          ? { taskFile: input.command.taskFile }
          : {})
      });
  const reviewerFocus = extractReviewerFocus(task.content);
  const reviewerBrief = await resolveReviewerBriefInput({
    ...(input.command.reviewerBrief !== undefined
      ? { reviewerBrief: input.command.reviewerBrief }
      : {}),
    ...(input.command.reviewerBriefFile !== undefined
      ? { reviewerBriefFile: input.command.reviewerBriefFile }
      : {}),
    accuracyCritical: input.command.accuracyCritical === true,
    cwd: input.command.cwd ?? process.cwd()
  });

  const prepared = prepareCreateBubbleInput({
    command: input.command,
    createdAt: input.createdAt,
    repoPath,
    baseBranch,
    reviewArtifactType,
    task
  });
  const normalizedRemoteAlias = prepared.bubbleConfigInput.executorRemote;
  const remotePointer =
    normalizedRemoteAlias === undefined
      ? undefined
      : await (async (): Promise<BubbleRemotePointerCreated> => {
          const loadGlobalConfig =
            input.dependencies.loadPairflowGlobalConfig ?? loadPairflowGlobalConfig;
          try {
            const globalConfig = await loadGlobalConfig();
            const resolvedRemote = resolveCreateRemoteAlias({
              remoteAlias: normalizedRemoteAlias,
              remotes: globalConfig.remotes
            });

            return {
              kind: "created",
              host: resolvedRemote.host,
              ...(resolvedRemote.portForwards !== undefined
                ? { portForwards: resolvedRemote.portForwards }
                : {})
            };
          } catch (error) {
            if (error instanceof SchemaValidationError) {
              throw new BubbleCreateError(error.message);
            }
            throw error;
          }
        })();

  return {
    repoPath,
    paths,
    task,
    reviewerFocus,
    ...(reviewerBrief !== undefined ? { reviewerBrief } : {}),
    ...(remotePointer !== undefined ? { remotePointer } : {}),
    prepared,
    config: buildBubbleConfig(prepared.bubbleConfigInput),
    state: assertValidBubbleStateSnapshot(
      createInitialBubbleState(input.command.id)
    )
  };
}
