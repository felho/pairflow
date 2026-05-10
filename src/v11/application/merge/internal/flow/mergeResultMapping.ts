import type {
  MergeBubbleResult,
  MergeCleanupOutcome
} from "../../mergeCommandContract.js";

export interface BuildMergeBubbleResultInput {
  bubbleId: string;
  baseBranch: string;
  bubbleBranch: string;
  mergeCommitSha: string;
  presentationRoute: "local" | "started_remote";
  pushedBaseBranch: boolean;
  deletedRemoteBranch: boolean;
  cleanupOutcome: MergeCleanupOutcome;
}

export function buildMergeBubbleResult(
  input: BuildMergeBubbleResultInput
): MergeBubbleResult {
  return {
    bubbleId: input.bubbleId,
    baseBranch: input.baseBranch,
    bubbleBranch: input.bubbleBranch,
    mergeCommitSha: input.mergeCommitSha,
    presentationRoute: input.presentationRoute,
    pushedBaseBranch: input.pushedBaseBranch,
    deletedRemoteBranch: input.deletedRemoteBranch,
    tmuxSessionName: input.cleanupOutcome.tmuxSessionName,
    tmuxSessionExisted: input.cleanupOutcome.tmuxSessionExisted,
    runtimeSessionRemoved: input.cleanupOutcome.runtimeSessionRemoved,
    removedWorktree: input.cleanupOutcome.removedWorktree,
    removedBubbleBranch: input.cleanupOutcome.removedBubbleBranch
  };
}
