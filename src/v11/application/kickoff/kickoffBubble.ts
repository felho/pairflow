import {
  resolveKickoffDependencies,
} from "./internal/validation/kickoffDependencyResolution.js";
import type { KickoffDependencyOverrides } from "./internal/validation/kickoffDependencyContract.js";
import type { RunKickoffFlowResult } from "./internal/validation/kickoffFlowContract.js";
import { runKickoffFlow } from "./runKickoffFlow.js";

export interface KickoffBubbleInput {
  bubbleId: string;
  repoPath?: string;
  task?: string;
  taskFile?: string;
  cwd?: string;
  now?: Date;
}

export type KickoffBubbleResult = RunKickoffFlowResult;

export type KickoffBubbleDependencies = KickoffDependencyOverrides;

export async function kickoffBubble(
  input: KickoffBubbleInput,
  dependencies: KickoffBubbleDependencies = {}
): Promise<KickoffBubbleResult> {
  const now = input.now ?? new Date();
  return runKickoffFlow(
    {
      bubbleId: input.bubbleId,
      ...(input.repoPath !== undefined ? { repoPath: input.repoPath } : {}),
      ...(input.task !== undefined ? { task: input.task } : {}),
      ...(input.taskFile !== undefined ? { taskFile: input.taskFile } : {}),
      ...(input.cwd !== undefined ? { cwd: input.cwd } : {}),
      now,
      nowIso: now.toISOString()
    },
    resolveKickoffDependencies(dependencies)
  );
}
