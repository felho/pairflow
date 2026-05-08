import type {
  EmitAskHumanDependencies,
  EmitAskHumanInput,
  EmitAskHumanResult
} from "./askHumanCommandContract.js";
import { buildAskHumanCommandContext } from "./askHumanCommandContextBuilder.js";
import { createAskHumanCommandOrchestrationDependencies } from "./askHumanFlowDependencyWiring.js";
import { orchestrateAskHumanCommand } from "./askHumanCommandOrchestration.js";

export async function dispatchAskHumanCommandOrchestration(
  input: EmitAskHumanInput,
  dependencies: EmitAskHumanDependencies,
  createError: PairflowCreateCommandError
): Promise<EmitAskHumanResult> {
  const context = buildAskHumanCommandContext({
    commandInput: input,
    createError
  });

  return orchestrateAskHumanCommand(
    context.orchestrationInput,
    createAskHumanCommandOrchestrationDependencies(dependencies)
  );
}
