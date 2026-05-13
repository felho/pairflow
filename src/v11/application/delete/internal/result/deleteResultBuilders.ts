import type {
  DeleteBubbleArtifacts,
  DeleteBubbleResult
} from "../../../../../contracts/deleteBubble.js";
import type { BubbleLifecycleState } from "../../../../../contracts/kernel/lifecycle.js";
import type {
  DeleteRuntimeCleanupResult,
  DeleteWorkspaceCleanupResult
} from "../types/deleteTypes.js";

export function requiresDeleteConfirmation(
  artifacts: DeleteBubbleArtifacts,
  force: boolean | undefined
): boolean {
  return (
    force !== true &&
    (artifacts.worktree.exists || artifacts.tmux.exists || artifacts.branch.exists)
  );
}

export function buildDeleteConfirmationResult(
  bubbleId: string,
  artifacts: DeleteBubbleArtifacts
): DeleteBubbleResult {
  return {
    bubbleId,
    deleted: false,
    requiresConfirmation: true,
    artifacts,
    tmuxSessionTerminated: false,
    runtimeSessionRemoved: false,
    removedWorktree: false,
    removedBubbleBranch: false
  };
}

export const preDeleteStopStateByLifecycle: Readonly<
  Record<BubbleLifecycleState, boolean>
> = {
  CREATED: false,
  PREPARING_WORKSPACE: true,
  RUNNING: true,
  WAITING_HUMAN: true,
  READY_FOR_HUMAN_APPROVAL: true,
  APPROVED_FOR_COMMIT: true,
  COMMITTED: false,
  DONE: false,
  FAILED: false,
  CANCELLED: false
};

export function buildDeleteSuccessResult(input: {
  bubbleId: string;
  artifacts: DeleteBubbleArtifacts;
  runtimeCleanup: DeleteRuntimeCleanupResult;
  workspaceCleanup: DeleteWorkspaceCleanupResult;
}): DeleteBubbleResult {
  return {
    bubbleId: input.bubbleId,
    deleted: true,
    requiresConfirmation: false,
    artifacts: input.artifacts,
    tmuxSessionTerminated: input.runtimeCleanup.tmuxSessionTerminated,
    runtimeSessionRemoved: input.runtimeCleanup.runtimeSessionRemoved,
    removedWorktree: input.workspaceCleanup.removedWorktree,
    removedBubbleBranch: input.workspaceCleanup.removedBubbleBranch
  };
}
