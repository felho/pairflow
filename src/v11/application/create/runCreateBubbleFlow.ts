import { join, resolve } from "node:path";

import {
  FileLockTimeoutError,
  withFileLock
} from "../../infrastructure/foundation/fs/fileLock.js";
import { getBubblePaths } from "../../shared/bubble/bubblePaths.js";
import type {
  BubbleCreateDependencies,
  BubbleCreateInput,
  BubbleCreateResult
} from "./createCommandContract.js";
import { BubbleCreateError, validateBubbleId } from "./createCommandRuntime.js";
import { persistCreatedBubbleArtifacts } from "./createBubblePersistence.js";
import {
  buildCreateBubbleResult,
  emitCreateBubbleLifecycleEvent
} from "./createBubbleFinalization.js";
import { prepareCreateBubbleFlowContext } from "./createBubbleFlowContext.js";

export async function runCreateBubbleFlow(
  input: BubbleCreateInput,
  dependencies: BubbleCreateDependencies = {}
): Promise<BubbleCreateResult> {
  const createdAt = input.now ?? new Date();
  validateBubbleId(input.id);
  const repoPath = resolve(input.repoPath);
  const bubblePaths = getBubblePaths(repoPath, input.id);
  // Create needs its own mutex; the protocol append path also uses <bubbleId>.lock.
  const lockPath = join(bubblePaths.locksDir, `${input.id}.create.lock`);

  try {
    return await withFileLock(
      {
        lockPath,
        timeoutMs: 5_000,
        ensureParentDir: true
      },
      async () => {
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
    );
  } catch (error) {
    if (error instanceof FileLockTimeoutError) {
      throw new BubbleCreateError(
        `Could not acquire bubble create lock: ${lockPath}`
      );
    }
    throw error;
  }
}
