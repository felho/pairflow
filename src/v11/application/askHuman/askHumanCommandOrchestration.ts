import { runAskHumanCommandFlowOrchestration } from "./askHumanCommandFlowOrchestration.js";
import { resolveAskHumanCommandOrchestrationDependencies } from "./askHumanCommandOrchestrationDependencyResolution.js";
import { buildAskHumanCommandFlowOrchestrationCallInput } from "./askHumanCommandFlowOrchestrationCallInputBuilder.js";
import { buildAskHumanCommandOrchestrationDependencyResolutionInput } from "./askHumanCommandOrchestrationDependencyResolutionInputBuilder.js";
import type {
  AskHumanCommandOrchestrationDependencies,
  AskHumanCommandOrchestrationInput,
  AskHumanCommandOrchestrationResult
} from "./askHumanCommandOrchestrationContract.js";

export async function orchestrateAskHumanCommand(
  input: AskHumanCommandOrchestrationInput,
  dependencies: AskHumanCommandOrchestrationDependencies
): Promise<AskHumanCommandOrchestrationResult> {
  const resolvedDependencies = resolveAskHumanCommandOrchestrationDependencies(
    buildAskHumanCommandOrchestrationDependencyResolutionInput(dependencies)
  );
  const flowCallInput = buildAskHumanCommandFlowOrchestrationCallInput(
    input,
    dependencies,
    resolvedDependencies
  );

  return runAskHumanCommandFlowOrchestration(
    flowCallInput.input,
    flowCallInput.dependencies,
    flowCallInput.resolvedDependencies
  );
}
