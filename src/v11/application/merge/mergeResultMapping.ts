import type { MergeBubbleResult } from "./mergeCommandContract.js";

export interface BuildMergeBubbleResultInput {
  bubbleId: string;
  baseBranch: string;
  bubbleBranch: string;
  mergeCommitSha: string;
  pushedBaseBranch: boolean;
  deletedRemoteBranch: boolean;
  tmuxSessionName: string;
  tmuxSessionExisted: boolean;
  runtimeSessionRemoved: boolean;
  removedWorktree: boolean;
  removedBubbleBranch: boolean;
}

export function buildMergeBubbleResult(
  input: BuildMergeBubbleResultInput
): MergeBubbleResult {
  return {
    bubbleId: input.bubbleId,
    baseBranch: input.baseBranch,
    bubbleBranch: input.bubbleBranch,
    mergeCommitSha: input.mergeCommitSha,
    pushedBaseBranch: input.pushedBaseBranch,
    deletedRemoteBranch: input.deletedRemoteBranch,
    tmuxSessionName: input.tmuxSessionName,
    tmuxSessionExisted: input.tmuxSessionExisted,
    runtimeSessionRemoved: input.runtimeSessionRemoved,
    removedWorktree: input.removedWorktree,
    removedBubbleBranch: input.removedBubbleBranch
  };
}
