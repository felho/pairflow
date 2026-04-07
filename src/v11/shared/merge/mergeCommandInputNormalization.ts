import { requireNonEmptyString } from "../normalization/stringNormalization.js";

export interface MergeBubbleInputLike {
  bubbleId: string;
  repoPath?: string | undefined;
  cwd?: string | undefined;
  push?: boolean | undefined;
  deleteRemote?: boolean | undefined;
  now?: Date | undefined;
}

export interface NormalizedMergeBubbleInput {
  bubbleId: string;
  repoPath?: string;
  cwd?: string;
  push: boolean;
  deleteRemote: boolean;
  now: Date;
  nowIso: string;
}

export function normalizeMergeBubbleInput(
  input: MergeBubbleInputLike,
  createError: PairflowCreateCommandError
): NormalizedMergeBubbleInput {
  const now = input.now ?? new Date();
  return {
    bubbleId: requireNonEmptyString(input.bubbleId, "Bubble id", createError),
    ...(input.repoPath !== undefined ? { repoPath: input.repoPath } : {}),
    ...(input.cwd !== undefined ? { cwd: input.cwd } : {}),
    push: input.push ?? false,
    deleteRemote: input.deleteRemote ?? false,
    now,
    nowIso: now.toISOString()
  };
}
