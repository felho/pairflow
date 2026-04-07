import type {
  EmitAskHumanDependencies,
  EmitAskHumanInput,
  EmitAskHumanResult
} from "../../shared/askHuman/askHumanCommandContract.js";
import { buildAskHumanCommandDispatchInvocation } from "../../shared/askHuman/askHumanCommandDispatchInvocationBuilder.js";
import { buildAskHumanCommandOrchestrationCallInput } from "../../shared/askHuman/askHumanCommandOrchestrationCallInputBuilder.js";
import { buildAskHumanCommandOrchestrationInvocation } from "./askHumanCommandOrchestrationInvocationBuilder.js";
import { orchestrateAskHumanCommand } from "./askHumanCommandOrchestration.js";

export async function dispatchAskHumanCommandOrchestration(
  input: EmitAskHumanInput,
  dependencies: EmitAskHumanDependencies,
  createError: PairflowCreateCommandError
): Promise<EmitAskHumanResult> {
  const invocation = buildAskHumanCommandOrchestrationInvocation(
    buildAskHumanCommandDispatchInvocation(input, dependencies, createError)
  );
  const orchestrationCallInput =
    buildAskHumanCommandOrchestrationCallInput(invocation);

  return orchestrateAskHumanCommand(
    orchestrationCallInput.input,
    orchestrationCallInput.dependencies
  );
}
