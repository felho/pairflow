import { resolve } from "node:path";

import { getBubblePaths } from "../../../core/bubble/paths.js";
import {
  assertValidBubbleStateSnapshot
} from "../../../core/state/stateSchema.js";
import { createInitialBubbleState } from "../../../core/state/initialState.js";
import type {
  BubbleCreateDependencies,
  BubbleCreateInput,
  BubbleCreateResult
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
import { extractReviewerFocus } from "./createReviewerFocus.js";
import { persistCreatedBubbleArtifacts } from "./createBubblePersistence.js";
import { prepareCreateBubbleInput } from "./createBubblePreparation.js";
import {
  buildCreateBubbleResult,
  emitCreateBubbleLifecycleEvent
} from "./createBubbleFinalization.js";

export async function createBubbleV11(
  input: BubbleCreateInput,
  dependencies: BubbleCreateDependencies = {}
): Promise<BubbleCreateResult> {
  validateBubbleId(input.id);
  const createdAt = input.now ?? new Date();
  const reviewArtifactType = resolveCreateReviewArtifactType(input.reviewArtifactType);

  const repoPath = resolve(input.repoPath);
  await ensureRepoPathIsGitRepo(repoPath);

  const baseBranch = input.baseBranch.trim();
  if (baseBranch.length === 0) {
    throw new BubbleCreateError("Base branch cannot be empty.");
  }

  const paths = getBubblePaths(repoPath, input.id);
  await ensureBubbleDoesNotExist(paths.bubbleDir);
  const ideationMode = input.ideation === true;
  const task = ideationMode
    ? {
        content: buildIdeationPlaceholderTaskContent(input.id),
        source: "ideation_placeholder" as const
      }
    : await resolveTaskInput({
        cwd: input.cwd ?? process.cwd(),
        ...(input.task !== undefined ? { task: input.task } : {}),
        ...(input.taskFile !== undefined ? { taskFile: input.taskFile } : {})
      });
  const reviewerFocus = extractReviewerFocus(task.content);
  const accuracyCritical = input.accuracyCritical === true;
  const reviewerBrief = await resolveReviewerBriefInput({
    ...(input.reviewerBrief !== undefined
      ? { reviewerBrief: input.reviewerBrief }
      : {}),
    ...(input.reviewerBriefFile !== undefined
      ? { reviewerBriefFile: input.reviewerBriefFile }
      : {}),
    accuracyCritical: input.accuracyCritical === true,
    cwd: input.cwd ?? process.cwd()
  });
  const prepared = prepareCreateBubbleInput({
    command: input,
    createdAt,
    repoPath,
    baseBranch,
    reviewArtifactType,
    task
  });

  const config = buildBubbleConfig(prepared.bubbleConfigInput);
  const state = assertValidBubbleStateSnapshot(createInitialBubbleState(input.id));
  const reviewerFocusArtifactPersist = await persistCreatedBubbleArtifacts({
    bubbleId: input.id,
    createdAt,
    paths,
    config,
    state,
    task,
    reviewerFocus,
    ...(reviewerBrief !== undefined ? { reviewerBrief } : {}),
    ideationMode: prepared.ideationMode,
    dependencies
  });

  await emitCreateBubbleLifecycleEvent({
    repoPath,
    bubbleId: input.id,
    bubbleInstanceId: prepared.bubbleConfigInput.bubbleInstanceId,
    config,
    task,
    reviewerFocus,
    reviewerFocusArtifactPersist,
    ideationMode: prepared.ideationMode,
    createdAt
  });

  return buildCreateBubbleResult({
    bubbleId: input.id,
    paths,
    config,
    state,
    task,
    reviewerFocus,
    reviewerFocusArtifactPersist,
    ...(reviewerBrief !== undefined ? { reviewerBrief } : {})
  });
}
