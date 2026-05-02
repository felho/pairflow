import type { ResolvedKickoffDependencies } from "./kickoffDependencyContract.js";
import type {
  RunKickoffFlowInput,
  RunKickoffFlowResult
} from "./kickoffFlowContract.js";
import { prepareKickoffValidation } from "./kickoffValidationPreparation.js";
import { executeKickoffValidatedFlow } from "./kickoffValidatedExecution.js";
import {
  buildKickoffExecutionStepInput,
  buildKickoffValidationStepInput
} from "./kickoffFlowStepInputBuilders.js";

export async function runKickoffFlow(
  input: RunKickoffFlowInput,
  dependencies: ResolvedKickoffDependencies
): Promise<RunKickoffFlowResult> {
  const validation = await prepareKickoffValidation(
    buildKickoffValidationStepInput(input),
    dependencies
  );
  if (validation.kind === "failure") {
    return validation.result;
  }

  return executeKickoffValidatedFlow(
    buildKickoffExecutionStepInput({
      validation,
      now: input.now,
      nowIso: input.nowIso
    }),
    dependencies
  );
}

export type { RunKickoffFlowInput, RunKickoffFlowResult };
