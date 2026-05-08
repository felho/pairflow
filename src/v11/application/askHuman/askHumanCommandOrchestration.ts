import { runAskHumanCommandFlowOrchestration } from "./askHumanCommandFlowOrchestration.js";
import { prepareAskHumanRouting } from "./askHumanRoutingPreparation.js";
import { runAskHumanFlow } from "./runAskHumanFlow.js";
import type {
  AskHumanCommandOrchestrationDependencies,
  AskHumanCommandOrchestrationInput,
  AskHumanCommandOrchestrationResult
} from "./askHumanCommandOrchestrationContract.js";

export async function orchestrateAskHumanCommand(
  input: AskHumanCommandOrchestrationInput,
  dependencies: AskHumanCommandOrchestrationDependencies
): Promise<AskHumanCommandOrchestrationResult> {
  const resolvedDependencies = {
    prepareAskHumanRouting:
      dependencies.prepareAskHumanRouting ?? prepareAskHumanRouting,
    runAskHumanFlow: dependencies.runAskHumanFlow ?? runAskHumanFlow
  };

  return runAskHumanCommandFlowOrchestration(
    input,
    dependencies,
    resolvedDependencies
  );
}
