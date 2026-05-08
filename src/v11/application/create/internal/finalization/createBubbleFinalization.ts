import { emitBubbleLifecycleEventBestEffort } from "../../../metrics/bubbleEvents.js";
import type {
  BubbleCreateResult,
  ResolvedTaskInput
} from "../runtime/createCommandContract.js";
import type { BubblePaths } from "../../../../shared/bubble/bubblePaths.js";
import type { BubbleConfig } from "../../../../shared/config/bubbleConfigTypes.js";
import type { BubbleStateSnapshot } from "../../../../shared/state/bubbleStateSnapshotTypes.js";
import type { ReviewerFocusExtractionResult } from "../../../../shared/reviewer/reviewerBrief.js";
import type { ReviewerFocusArtifactPersistResult } from "../persistence/createBubblePersistence.js";

export async function emitCreateBubbleLifecycleEvent(input: {
  repoPath: string;
  bubbleId: string;
  bubbleInstanceId: string;
  config: BubbleConfig;
  task: ResolvedTaskInput;
  reviewerFocus: ReviewerFocusExtractionResult;
  reviewerFocusArtifactPersist: ReviewerFocusArtifactPersistResult;
  ideationMode: boolean;
  createdAt: Date;
}): Promise<void> {
  await emitBubbleLifecycleEventBestEffort({
    repoPath: input.repoPath,
    bubbleId: input.bubbleId,
    bubbleInstanceId: input.bubbleInstanceId,
    eventType: "bubble_created",
    round: null,
    actorRole: "orchestrator",
    metadata: {
      base_branch: input.config.base_branch,
      bubble_branch: input.config.bubble_branch,
      review_artifact_type: input.config.review_artifact_type,
      task_source: input.task.source,
      ideation_mode: input.ideationMode,
      ideation_task_pending: input.ideationMode,
      reviewer_focus_status: input.reviewerFocus.status,
      reviewer_focus_artifact_write: input.reviewerFocusArtifactPersist.status,
      ...(input.reviewerFocusArtifactPersist.errorCode !== undefined
        ? {
            reviewer_focus_artifact_write_error_code:
              input.reviewerFocusArtifactPersist.errorCode
          }
        : {})
    },
    now: input.createdAt
  });
}

export function buildCreateBubbleResult(input: {
  bubbleId: string;
  paths: BubblePaths;
  config: BubbleConfig;
  state: BubbleStateSnapshot;
  task: ResolvedTaskInput;
  reviewerFocus: ReviewerFocusExtractionResult;
  reviewerFocusArtifactPersist: ReviewerFocusArtifactPersistResult;
  reviewerBrief?: ResolvedTaskInput | undefined;
}): BubbleCreateResult {
  return {
    bubbleId: input.bubbleId,
    paths: input.paths,
    config: input.config,
    state: input.state,
    task: input.task,
    reviewerFocus: input.reviewerFocus,
    reviewerFocusArtifactPersist: input.reviewerFocusArtifactPersist,
    ...(input.reviewerBrief !== undefined
      ? { reviewerBrief: input.reviewerBrief }
      : {})
  };
}
