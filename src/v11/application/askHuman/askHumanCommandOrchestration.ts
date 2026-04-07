import { runAskHumanCommandFlowOrchestration } from "../../shared/askHuman/askHumanCommandFlowOrchestration.js";
import { resolveAskHumanCommandOrchestrationDependencies } from "./askHumanCommandOrchestrationDependencyResolution.js";
import { buildAskHumanCommandFlowOrchestrationCallInput } from "../../shared/askHuman/askHumanCommandFlowOrchestrationCallInputBuilder.js";
import { buildAskHumanCommandOrchestrationDependencyResolutionInput } from "../../shared/askHuman/askHumanCommandOrchestrationDependencyResolutionInputBuilder.js";
import type {
  AskHumanCommandOrchestrationDependencies,
  AskHumanCommandOrchestrationInput,
  AskHumanCommandOrchestrationResult
} from "../../shared/askHuman/askHumanCommandOrchestrationContract.js";

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
