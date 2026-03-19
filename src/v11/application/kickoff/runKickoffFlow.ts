import type { ResolvedKickoffDependencies } from "../../shared/kickoff/kickoffDependencyResolution.js";
import type {
  RunKickoffFlowInput,
  RunKickoffFlowResult
} from "../../shared/kickoff/kickoffFlowContract.js";
import { prepareKickoffValidation } from "../../shared/kickoff/kickoffValidationPreparation.js";
import { executeKickoffValidatedFlow } from "../../shared/kickoff/kickoffValidatedExecution.js";
import {
  buildKickoffExecutionStepInput,
  buildKickoffValidationStepInput
} from "../../shared/kickoff/kickoffFlowStepInputBuilders.js";

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
