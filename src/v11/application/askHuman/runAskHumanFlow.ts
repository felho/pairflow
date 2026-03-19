import { buildAskHumanExecutionDependencies } from "../../shared/askHuman/askHumanExecutionDependencyBuilder.js";
import { buildAskHumanFinalizationDependencies } from "../../shared/askHuman/askHumanFinalizationDependencyBuilder.js";
import {
  buildAskHumanExecutionStepInput,
  buildAskHumanFinalizationStepInput
} from "../../shared/askHuman/askHumanFlowStepInputBuilders.js";
import type {
  RunAskHumanFlowDependencies,
  RunAskHumanFlowInput,
  RunAskHumanFlowResult
} from "../../shared/askHuman/askHumanFlowContract.js";

export async function runAskHumanFlow(
  input: RunAskHumanFlowInput,
  dependencies: RunAskHumanFlowDependencies
): Promise<RunAskHumanFlowResult> {
  const execution = await dependencies.executeAskHumanExecution(
    buildAskHumanExecutionStepInput({
      now: input.now,
      routing: input.routing,
      createError: input.createError
    }),
    buildAskHumanExecutionDependencies(dependencies)
  );

  return dependencies.finalizeAskHumanFlow(
    buildAskHumanFinalizationStepInput({
      now: input.now,
      routing: input.routing,
      appended: execution.appended,
      written: execution.written
    }),
    buildAskHumanFinalizationDependencies(dependencies)
  );
}
