import { requireNonEmptyString } from "../../../core/util/normalize.js";
import type { MergeBubbleInput } from "../../application/merge/mergeCommandContract.js";

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
  input: MergeBubbleInput,
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
