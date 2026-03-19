import {
  resolveKickoffDependencies,
  type KickoffDependencyOverrides
} from "../../v11/shared/kickoff/kickoffDependencyResolution.js";
import { buildKickoffEntrypointInvocation } from "../../v11/shared/kickoff/kickoffEntrypointInvocationBuilder.js";
import type { RunKickoffFlowResult } from "../../v11/shared/kickoff/kickoffFlowContract.js";
import { runKickoffFlow } from "../../v11/application/kickoff/runKickoffFlow.js";

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
  return runKickoffFlow(
    buildKickoffEntrypointInvocation({
      normalizedInput: {
        bubbleId: input.bubbleId,
        ...(input.repoPath !== undefined ? { repoPath: input.repoPath } : {}),
        ...(input.task !== undefined ? { task: input.task } : {}),
        ...(input.taskFile !== undefined ? { taskFile: input.taskFile } : {}),
        ...(input.cwd !== undefined ? { cwd: input.cwd } : {}),
        now: input.now ?? new Date()
      }
    }),
    resolveKickoffDependencies(dependencies)
  );
}
