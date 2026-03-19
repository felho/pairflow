import type { RunKickoffFlowInput } from "./kickoffFlowContract.js";

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

function buildKickoffOptionalInvocationFields(
  input: BuildKickoffEntrypointInvocationInput["normalizedInput"]
): Pick<RunKickoffFlowInput, "repoPath" | "task" | "taskFile" | "cwd"> {
  return {
    ...(input.repoPath !== undefined ? { repoPath: input.repoPath } : {}),
    ...(input.task !== undefined ? { task: input.task } : {}),
    ...(input.taskFile !== undefined ? { taskFile: input.taskFile } : {}),
    ...(input.cwd !== undefined ? { cwd: input.cwd } : {})
  };
}

export function buildKickoffEntrypointInvocation(
  input: BuildKickoffEntrypointInvocationInput
): RunKickoffFlowInput {
  const { normalizedInput } = input;
  return {
    bubbleId: normalizedInput.bubbleId,
    ...buildKickoffOptionalInvocationFields(normalizedInput),
    now: normalizedInput.now,
    nowIso: normalizedInput.now.toISOString()
  };
}
