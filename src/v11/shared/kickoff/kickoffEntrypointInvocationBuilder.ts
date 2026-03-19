import type { RunKickoffFlowInput } from "../../application/kickoff/runKickoffFlow.js";

export interface BuildKickoffEntrypointInvocationInput {
  normalizedInput: {
    bubbleId: string;
    repoPath?: string;
    task?: string;
    taskFile?: string;
    cwd?: string;
    now: Date;
  };
}

export function buildKickoffEntrypointInvocation(
  input: BuildKickoffEntrypointInvocationInput
): RunKickoffFlowInput {
  return {
    bubbleId: input.normalizedInput.bubbleId,
    ...(input.normalizedInput.repoPath !== undefined
      ? { repoPath: input.normalizedInput.repoPath }
      : {}),
    ...(input.normalizedInput.task !== undefined
      ? { task: input.normalizedInput.task }
      : {}),
    ...(input.normalizedInput.taskFile !== undefined
      ? { taskFile: input.normalizedInput.taskFile }
      : {}),
    ...(input.normalizedInput.cwd !== undefined
      ? { cwd: input.normalizedInput.cwd }
      : {}),
    now: input.normalizedInput.now,
    nowIso: input.normalizedInput.now.toISOString()
  };
}
