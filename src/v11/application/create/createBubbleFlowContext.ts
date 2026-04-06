import { resolve } from "node:path";

import { getBubblePaths, type BubblePaths } from "../../../core/bubble/paths.js";
import type { ReviewerFocusExtractionResult } from "../../../core/reviewer/reviewerBrief.js";
import { createInitialBubbleState } from "../../domain/state/initialState.js";
import {
  assertValidBubbleStateSnapshot
} from "../../shared/state/stateSchema.js";
import type {
  BubbleConfig,
  BubbleStateSnapshot
} from "../../../types/bubble.js";
import type {
  BubbleCreateInput,
  ResolvedTaskInput
} from "./createCommandContract.js";
import {
  BubbleCreateError,
  buildBubbleConfig,
  buildIdeationPlaceholderTaskContent,
  ensureBubbleDoesNotExist,
  ensureRepoPathIsGitRepo,
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
  prepared: PreparedCreateBubbleInput;
  config: BubbleConfig;
  state: BubbleStateSnapshot;
}

export async function prepareCreateBubbleFlowContext(input: {
  command: BubbleCreateInput;
  createdAt: Date;
}): Promise<CreateBubbleFlowContext> {
  validateBubbleId(input.command.id);
  const reviewArtifactType = resolveCreateReviewArtifactType(
    input.command.reviewArtifactType
  );

  const repoPath = resolve(input.command.repoPath);
  await ensureRepoPathIsGitRepo(repoPath);

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

  return {
    repoPath,
    paths,
    task,
    reviewerFocus,
    ...(reviewerBrief !== undefined ? { reviewerBrief } : {}),
    prepared,
    config: buildBubbleConfig(prepared.bubbleConfigInput),
    state: assertValidBubbleStateSnapshot(
      createInitialBubbleState(input.command.id)
    )
  };
}
