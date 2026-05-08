import type {
  EmitAskHumanDependencies,
  EmitAskHumanInput,
  EmitAskHumanResult
} from "./askHumanCommandContract.js";
import { buildAskHumanCommandOrchestrationInvocation } from "./askHumanCommandOrchestrationInvocationBuilder.js";
import { orchestrateAskHumanCommand } from "./askHumanCommandOrchestration.js";

export async function dispatchAskHumanCommandOrchestration(
  input: EmitAskHumanInput,
  dependencies: EmitAskHumanDependencies,
  createError: PairflowCreateCommandError
): Promise<EmitAskHumanResult> {
  const invocation = buildAskHumanCommandOrchestrationInvocation(
    {
      commandInput: input,
      runtimeDependencies: dependencies,
      createError
    }
  );

  return orchestrateAskHumanCommand(
    invocation.orchestrationInput,
    invocation.orchestrationDependencies
  );
}
