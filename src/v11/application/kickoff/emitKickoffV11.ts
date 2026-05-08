import {
  resolveKickoffDependencies,
} from "./kickoffDependencyResolution.js";
import type { KickoffDependencyOverrides } from "./kickoffDependencyContract.js";
import type { RunKickoffFlowResult } from "./kickoffFlowContract.js";
import { runKickoffFlow } from "./runKickoffFlow.js";

export interface KickoffBubbleV11Input {
  bubbleId: string;
  repoPath?: string;
  task?: string;
  taskFile?: string;
  cwd?: string;
  now?: Date;
}

export type KickoffBubbleV11Result = RunKickoffFlowResult;

export type KickoffBubbleV11Dependencies = KickoffDependencyOverrides;

export async function kickoffBubbleV11(
  input: KickoffBubbleV11Input,
  dependencies: KickoffBubbleV11Dependencies = {}
): Promise<KickoffBubbleV11Result> {
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
