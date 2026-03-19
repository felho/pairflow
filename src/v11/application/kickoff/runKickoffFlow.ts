import type { ResolvedKickoffDependencies } from "../../shared/kickoff/kickoffDependencyResolution.js";
import type { KickoffBubbleResultShape } from "../../shared/kickoff/kickoffResultBuilders.js";
import { prepareKickoffValidation } from "../../shared/kickoff/kickoffValidationPreparation.js";
import { executeKickoffValidatedFlow } from "../../shared/kickoff/kickoffValidatedExecution.js";

export interface RunKickoffFlowInput {
  bubbleId: string;
  repoPath?: string;
  task?: string;
  taskFile?: string;
  cwd?: string;
  now: Date;
  nowIso: string;
}

export type RunKickoffFlowResult = KickoffBubbleResultShape;

export async function runKickoffFlow(
  input: RunKickoffFlowInput,
  dependencies: ResolvedKickoffDependencies
): Promise<RunKickoffFlowResult> {
  const validation = await prepareKickoffValidation({
    bubbleId: input.bubbleId,
    ...(input.repoPath !== undefined ? { repoPath: input.repoPath } : {}),
    ...(input.task !== undefined ? { task: input.task } : {}),
    ...(input.taskFile !== undefined ? { taskFile: input.taskFile } : {}),
    ...(input.cwd !== undefined ? { cwd: input.cwd } : {})
  }, dependencies);
  if (validation.kind === "failure") {
    return validation.result;
  }

  return executeKickoffValidatedFlow({
    validation,
    now: input.now,
    nowIso: input.nowIso
  }, dependencies);
}
