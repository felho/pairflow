import { runAskHumanCommandFlowOrchestration } from "./askHumanCommandFlowOrchestration.js";
import { resolveAskHumanCommandOrchestrationDependencies } from "./askHumanCommandOrchestrationDependencyResolution.js";
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
    dependencies
  );

  return runAskHumanCommandFlowOrchestration(
    input,
    dependencies,
    resolvedDependencies
  );
}
