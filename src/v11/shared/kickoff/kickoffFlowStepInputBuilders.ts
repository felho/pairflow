import type {
  KickoffPreparedValidation,
  PrepareKickoffValidationInput
} from "./kickoffValidationPreparation.js";
import type { ExecuteKickoffValidatedFlowInput } from "./kickoffValidatedExecution.js";

export interface BuildKickoffValidationStepInput {
  bubbleId: string;
  repoPath?: string;
  task?: string;
  taskFile?: string;
  cwd?: string;
}

export function buildKickoffValidationStepInput(
  input: BuildKickoffValidationStepInput
): PrepareKickoffValidationInput {
  return {
    bubbleId: input.bubbleId,
    ...(input.repoPath !== undefined ? { repoPath: input.repoPath } : {}),
    ...(input.task !== undefined ? { task: input.task } : {}),
    ...(input.taskFile !== undefined ? { taskFile: input.taskFile } : {}),
    ...(input.cwd !== undefined ? { cwd: input.cwd } : {})
  };
}

export interface BuildKickoffExecutionStepInput {
  validation: KickoffPreparedValidation;
  now: Date;
  nowIso: string;
}

export function buildKickoffExecutionStepInput(
  input: BuildKickoffExecutionStepInput
): ExecuteKickoffValidatedFlowInput {
  return {
    validation: input.validation,
    now: input.now,
    nowIso: input.nowIso
  };
}
