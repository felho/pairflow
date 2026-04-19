import { resolve } from "node:path";

import { getBubblePaths, type BubblePaths } from "../../shared/bubble/bubblePaths.js";
import type { ReviewerFocusExtractionResult } from "../../../v11/shared/reviewer/reviewerBrief.js";
import { createInitialBubbleState } from "../../domain/state/initialState.js";
import {
  assertValidBubbleStateSnapshot
} from "../../shared/state/stateSchema.js";
import type {
  BubbleConfig,
  BubbleRemotePointerCreated,
  BubbleStateSnapshot
} from "../../../types/bubble.js";
import type {
  BubbleCreateDependencies,
  BubbleCreateInput,
  ResolvedTaskInput
} from "./createCommandContract.js";
import {
  buildBubbleConfig,
  buildIdeationPlaceholderTaskContent,
  ensureBubbleDoesNotExist,
  ensureRepoPathIsGitRepo,
  resolveCreateReviewArtifactType,
  resolveCreateBubbleRemoteExecution,
  resolveReviewerBriefInput,
  resolveTaskInput,
  toBubbleCreateError,
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
  remotePointer?: BubbleRemotePointerCreated | undefined;
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
    throw toBubbleCreateError({
      message: "Missing required create bubble dependency: assertGitRepository.",
      context: {
        dependency: "assertGitRepository",
        command_name: "create",
        bubble_id: input.command.id
      }
    });
  }
  await ensureRepoPathIsGitRepo(
    repoPath,
    input.dependencies.assertGitRepository
  );

  const baseBranch = input.command.baseBranch.trim();
  if (baseBranch.length === 0) {
    throw toBubbleCreateError({
      message: "Base branch cannot be empty.",
      context: {
        command_name: "create",
        bubble_id: input.command.id,
        base_branch: input.command.baseBranch
      }
    });
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

  let remoteExecution:
    | Awaited<ReturnType<typeof resolveCreateBubbleRemoteExecution>>
    | undefined;
  if (input.command.remote !== undefined) {
    if (input.dependencies.loadPairflowGlobalConfig === undefined) {
      throw toBubbleCreateError({
        message: "Missing required create bubble dependency: loadPairflowGlobalConfig.",
        context: {
          dependency: "loadPairflowGlobalConfig",
          command_name: "create",
          bubble_id: input.command.id,
          remote: input.command.remote
        }
      });
    }
    remoteExecution = await resolveCreateBubbleRemoteExecution({
      remote: input.command.remote,
      loadPairflowGlobalConfig: input.dependencies.loadPairflowGlobalConfig
    });
  }

  const prepared = prepareCreateBubbleInput({
    command: input.command,
    createdAt: input.createdAt,
    repoPath,
    baseBranch,
    reviewArtifactType,
    task,
    ...(remoteExecution !== undefined
      ? { executorRemote: remoteExecution.remoteAlias }
      : {})
  });

  return {
    repoPath,
    paths,
    task,
    reviewerFocus,
    ...(reviewerBrief !== undefined ? { reviewerBrief } : {}),
    ...(remoteExecution !== undefined
      ? { remotePointer: remoteExecution.remotePointer }
      : {}),
    prepared,
    config: buildBubbleConfig(prepared.bubbleConfigInput),
    state: assertValidBubbleStateSnapshot(
      createInitialBubbleState(input.command.id)
    )
  };
}
