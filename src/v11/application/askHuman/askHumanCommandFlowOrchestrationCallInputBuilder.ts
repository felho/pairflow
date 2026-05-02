import type {
  AskHumanCommandOrchestrationDependencies,
  AskHumanCommandOrchestrationInput
} from "./askHumanCommandOrchestrationContract.js";
import type { ResolvedAskHumanCommandOrchestrationDependencies } from "./askHumanCommandOrchestrationDependencyResolutionContract.js";

export interface AskHumanCommandFlowOrchestrationCallInput {
  input: AskHumanCommandOrchestrationInput;
  dependencies: AskHumanCommandOrchestrationDependencies;
  resolvedDependencies: ResolvedAskHumanCommandOrchestrationDependencies;
}

export function buildAskHumanCommandFlowOrchestrationCallInput(
  input: AskHumanCommandOrchestrationInput,
  dependencies: AskHumanCommandOrchestrationDependencies,
  resolvedDependencies: ResolvedAskHumanCommandOrchestrationDependencies
): AskHumanCommandFlowOrchestrationCallInput {
  return {
    input,
    dependencies,
    resolvedDependencies
  };
}
