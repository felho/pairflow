import type { DeleteBubbleResult } from "../../../contracts/deleteBubble.js";
import {
  buildDeleteSuccessResult,
  type DeleteBubbleInput,
  type DeleteExecutionContext,
  type DeleteRouteContext,
  type ResolvedBubble,
  type ResolvedDeleteDependencies
} from "./deleteBubbleSupport.js";
import {
  createDeleteArchive,
  removeDeleteBubbleDirectory
} from "./deleteBubbleFinalization.js";

function isRemoteDeleteInvalidTargetError(error: unknown): boolean {
  return (
    typeof error === "object"
    && error !== null
    && "code" in error
    && error.code === "REMOTE_DELETE_INVALID_TARGET"
  );
}

function buildRemoteDeleteMissingTargetFallbackResult(input: {
  routeContext: Extract<DeleteRouteContext, { route: "remote" }>;
}): DeleteBubbleResult {
  return buildDeleteSuccessResult({
    bubbleId: input.routeContext.resolved.bubbleId,
    artifacts: {
      worktree: {
        exists: false,
        path: input.routeContext.remotePointer.remoteClonePath
      },
      tmux: {
        exists: false,
        sessionName: input.routeContext.remotePointer.tmuxSession
      },
      runtimeSession: {
        exists: false,
        sessionName: null
      },
      branch: {
        exists: false,
        name: input.routeContext.resolved.bubbleConfig.bubble_branch
      }
    },
    runtimeCleanup: {
      tmuxSessionTerminated: false,
      runtimeSessionRemoved: false
    },
    workspaceCleanup: {
      removedWorktree: false,
      removedBubbleBranch: false
    }
  });
}

export async function maybeFinalizeRemoteDeleteMissingTargetFallback(input: {
  deleteInput: DeleteBubbleInput;
  routeContext: Extract<DeleteRouteContext, { route: "remote" }>;
  dependencies: ResolvedDeleteDependencies;
  now: Date;
  remoteDeleteError: unknown;
  determineDeleteExecutionContext: (
    resolved: ResolvedBubble,
    now: Date
  ) => Promise<DeleteExecutionContext>;
  returnDeleteSuccessWithLifecycle: (input: {
    result: DeleteBubbleResult;
    resolved: ResolvedBubble;
    execution: DeleteExecutionContext;
    force: boolean;
    now: Date;
  }) => Promise<DeleteBubbleResult>;
  toDeleteStepError: (input: {
    bubbleId: string;
    bubbleInstanceId: string;
    step: "snapshot" | "index" | "worktree-cleanup" | "remove-active";
    error: unknown;
  }) => Error;
  inferCreatedAtFromBubbleInstanceId: (bubbleInstanceId: string) => string | null;
}): Promise<DeleteBubbleResult | undefined> {
  if (
    input.deleteInput.force !== true
    || !isRemoteDeleteInvalidTargetError(input.remoteDeleteError)
  ) {
    return undefined;
  }

  const bubbleDirExists = await input.dependencies.pathExists(
    input.routeContext.resolved.bubblePaths.bubbleDir
  );
  if (!bubbleDirExists) {
    return undefined;
  }

  const execution = await input.determineDeleteExecutionContext(
    input.routeContext.resolved,
    input.now
  );
  await createDeleteArchive({
    input: input.deleteInput,
    resolved: input.routeContext.resolved,
    execution,
    dependencies: input.dependencies,
    now: input.now,
    inferCreatedAtFromBubbleInstanceId: input.inferCreatedAtFromBubbleInstanceId,
    toDeleteStepError: input.toDeleteStepError
  });
  await removeDeleteBubbleDirectory({
    resolved: input.routeContext.resolved,
    execution,
    dependencies: input.dependencies,
    toDeleteStepError: input.toDeleteStepError
  });
  return input.returnDeleteSuccessWithLifecycle({
    result: buildRemoteDeleteMissingTargetFallbackResult({
      routeContext: input.routeContext
    }),
    resolved: input.routeContext.resolved,
    execution,
    force: true,
    now: input.now
  });
}
