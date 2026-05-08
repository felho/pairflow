import type {
  BubbleCreateDependencies,
  BubbleCreateInput,
  BubbleCreateResult
} from "./createCommandContract.js";
import { persistCreatedBubbleArtifacts } from "../persistence/createBubblePersistence.js";
import {
  buildCreateBubbleResult,
  emitCreateBubbleLifecycleEvent
} from "../finalization/createBubbleFinalization.js";
import { prepareCreateBubbleFlowContext } from "../preparation/createBubbleFlowContext.js";

export async function runCreateBubbleFlow(
  input: BubbleCreateInput,
  dependencies: BubbleCreateDependencies = {}
): Promise<BubbleCreateResult> {
  const createdAt = input.now ?? new Date();
  const flowContext = await prepareCreateBubbleFlowContext({
    command: input,
    createdAt,
    dependencies
  });
  const reviewerFocusArtifactPersist = await persistCreatedBubbleArtifacts({
    bubbleId: input.id,
    createdAt,
    paths: flowContext.paths,
    config: flowContext.config,
    state: flowContext.state,
    task: flowContext.task,
    reviewerFocus: flowContext.reviewerFocus,
    ...(flowContext.reviewerBrief !== undefined
      ? { reviewerBrief: flowContext.reviewerBrief }
      : {}),
    ...(flowContext.remotePointer !== undefined
      ? { remotePointer: flowContext.remotePointer }
      : {}),
    ideationMode: flowContext.prepared.ideationMode,
    dependencies
  });

  await emitCreateBubbleLifecycleEvent({
    repoPath: flowContext.repoPath,
    bubbleId: input.id,
    bubbleInstanceId: flowContext.prepared.bubbleConfigInput.bubbleInstanceId,
    config: flowContext.config,
    task: flowContext.task,
    reviewerFocus: flowContext.reviewerFocus,
    reviewerFocusArtifactPersist,
    ideationMode: flowContext.prepared.ideationMode,
    createdAt
  });

  return buildCreateBubbleResult({
    bubbleId: input.id,
    paths: flowContext.paths,
    config: flowContext.config,
    state: flowContext.state,
    task: flowContext.task,
    reviewerFocus: flowContext.reviewerFocus,
    reviewerFocusArtifactPersist,
    ...(flowContext.reviewerBrief !== undefined
      ? { reviewerBrief: flowContext.reviewerBrief }
      : {})
  });
}
