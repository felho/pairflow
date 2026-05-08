import type { ResolvedKickoffDependencies } from "./kickoffDependencyContract.js";
import type {
  RunKickoffFlowInput,
  RunKickoffFlowResult
} from "./kickoffFlowContract.js";
import { prepareKickoffValidation } from "./kickoffValidationPreparation.js";
import { executeKickoffValidatedFlow } from "./kickoffValidatedExecution.js";

export async function runKickoffFlow(
  input: RunKickoffFlowInput,
  dependencies: ResolvedKickoffDependencies
): Promise<RunKickoffFlowResult> {
  const validation = await prepareKickoffValidation(
    {
      bubbleId: input.bubbleId,
      ...(input.repoPath !== undefined ? { repoPath: input.repoPath } : {}),
      ...(input.task !== undefined ? { task: input.task } : {}),
      ...(input.taskFile !== undefined ? { taskFile: input.taskFile } : {}),
      ...(input.cwd !== undefined ? { cwd: input.cwd } : {})
    },
    dependencies
  );
  if (validation.kind === "failure") {
    return validation.result;
  }

  return executeKickoffValidatedFlow(
    {
      validation,
      now: input.now,
      nowIso: input.nowIso
    },
    dependencies
  );
}

export type { RunKickoffFlowInput, RunKickoffFlowResult };
