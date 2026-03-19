import type {
  RunAskHumanFlowDependencies,
  RunAskHumanFlowInput
} from "./askHumanFlowContract.js";
import type {
  BuildAskHumanFlowDependenciesInput,
  BuildAskHumanFlowInputInput
} from "./askHumanFlowInvocationContract.js";
import { buildAskHumanFlowDependencyOptionalOverrides } from "./askHumanFlowDependencyOptionalOverrides.js";

export function buildAskHumanFlowInput(
  input: BuildAskHumanFlowInputInput
): RunAskHumanFlowInput {
  return {
    now: input.now,
    routing: input.routing,
    createError: input.createError
  };
}

export function buildAskHumanFlowDependencies(
  input: BuildAskHumanFlowDependenciesInput
): RunAskHumanFlowDependencies {
  return {
    executeAskHumanExecution: input.executeAskHumanExecution,
    finalizeAskHumanFlow: input.finalizeAskHumanFlow,
    ...buildAskHumanFlowDependencyOptionalOverrides(input)
  };
}
