import { resolve } from "node:path";

import { getBubblePaths } from "../../../core/bubble/paths.js";
import { emitBubbleLifecycleEventBestEffort } from "../../../core/metrics/bubbleEvents.js";
import {
  assertValidBubbleStateSnapshot
} from "../../../core/state/stateSchema.js";
import { createInitialBubbleState } from "../../../core/state/initialState.js";
import { generateBubbleInstanceId } from "../../../core/bubble/bubbleInstanceId.js";
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
  type CreateBubbleConfigInput,
  validateBubbleId
} from "./createCommandRuntime.js";
import { extractReviewerFocus } from "./createReviewerFocus.js";
import { persistCreatedBubbleArtifacts } from "./createBubblePersistence.js";

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

  const bubbleBranch = `bubble/${input.id}`;
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
    accuracyCritical,
    cwd: input.cwd ?? process.cwd()
  });

  const bubbleConfigInput: CreateBubbleConfigInput = {
    id: input.id,
    bubbleInstanceId: generateBubbleInstanceId(createdAt),
    repoPath,
    baseBranch,
    bubbleBranch,
    accuracyCritical,
    reviewArtifactType,
    ...(ideationMode
      ? {
          ideationMode: true,
          ideationStartedAt: createdAt.toISOString()
        }
      : {})
  };
  if (input.implementer !== undefined) {
    bubbleConfigInput.implementer = input.implementer;
  }
  if (input.reviewer !== undefined) {
    bubbleConfigInput.reviewer = input.reviewer;
  }
  if (input.testCommand !== undefined) {
    bubbleConfigInput.testCommand = input.testCommand;
  }
  if (input.typecheckCommand !== undefined) {
    bubbleConfigInput.typecheckCommand = input.typecheckCommand;
  }
  if (input.bootstrapCommand !== undefined) {
    bubbleConfigInput.bootstrapCommand = input.bootstrapCommand;
  }
  if (input.openCommand !== undefined) {
    bubbleConfigInput.openCommand = input.openCommand;
  }
  if (input.pairflowCommandProfile !== undefined) {
    bubbleConfigInput.pairflowCommandProfile = input.pairflowCommandProfile;
  }

  const config = buildBubbleConfig(bubbleConfigInput);
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
    ideationMode,
    dependencies
  });

  await emitBubbleLifecycleEventBestEffort({
    repoPath,
    bubbleId: input.id,
    bubbleInstanceId: bubbleConfigInput.bubbleInstanceId,
    eventType: "bubble_created",
    round: null,
    actorRole: "orchestrator",
    metadata: {
      base_branch: config.base_branch,
      bubble_branch: config.bubble_branch,
      review_artifact_type: config.review_artifact_type,
      task_source: task.source,
      ideation_mode: ideationMode,
      ideation_task_pending: ideationMode,
      reviewer_focus_status: reviewerFocus.status,
      reviewer_focus_artifact_write: reviewerFocusArtifactPersist.status,
      ...(reviewerFocusArtifactPersist.errorCode !== undefined
        ? {
            reviewer_focus_artifact_write_error_code:
              reviewerFocusArtifactPersist.errorCode
          }
        : {})
    },
    now: createdAt
  });

  return {
    bubbleId: input.id,
    paths,
    config,
    state,
    task,
    reviewerFocus,
    reviewerFocusArtifactPersist,
    ...(reviewerBrief !== undefined ? { reviewerBrief } : {})
  };
}
