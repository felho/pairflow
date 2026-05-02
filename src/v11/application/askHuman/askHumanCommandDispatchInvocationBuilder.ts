import type { BuildAskHumanCommandOrchestrationInvocationInput } from "./askHumanCommandOrchestrationInvocationContract.js";
import type {
  EmitAskHumanDependencies,
  EmitAskHumanInput
} from "./askHumanCommandContract.js";

export function buildAskHumanCommandDispatchInvocation(
  input: EmitAskHumanInput,
  dependencies: EmitAskHumanDependencies,
  createError: PairflowCreateCommandError
): BuildAskHumanCommandOrchestrationInvocationInput {
  return {
    commandInput: input,
    runtimeDependencies: dependencies,
    createError
  };
}
