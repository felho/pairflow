import type {
  EmitAskHumanDependencies,
  EmitAskHumanInput,
  EmitAskHumanResult
} from "./askHumanCommandContract.js";
import { buildAskHumanCommandDispatchInvocation } from "./askHumanCommandDispatchInvocationBuilder.js";
import { buildAskHumanCommandOrchestrationInvocation } from "./askHumanCommandOrchestrationInvocationBuilder.js";
import { orchestrateAskHumanCommand } from "./askHumanCommandOrchestration.js";

export async function dispatchAskHumanCommandOrchestration(
  input: EmitAskHumanInput,
  dependencies: EmitAskHumanDependencies,
  createError: (message: string) => Error
): Promise<EmitAskHumanResult> {
  const invocation = buildAskHumanCommandOrchestrationInvocation(
    buildAskHumanCommandDispatchInvocation(input, dependencies, createError)
  );

  return orchestrateAskHumanCommand(
    invocation.orchestrationInput,
    invocation.orchestrationDependencies
  );
}
