import type {
  EmitAskHumanDependencies,
  EmitAskHumanInput,
  EmitAskHumanResult
} from "./askHumanCommandContract.js";
import {
  createAskHumanCommandError,
  throwAsAskHumanCommandError
} from "./askHumanCommandRuntime.js";
import { buildAskHumanCommandOrchestrationInvocation } from "./askHumanCommandOrchestrationInvocationBuilder.js";
import { orchestrateAskHumanCommand } from "./askHumanCommandOrchestration.js";

export async function emitAskHumanFromWorkspace(
  input: EmitAskHumanInput,
  dependencies: EmitAskHumanDependencies = {}
): Promise<EmitAskHumanResult> {
  const invocation = buildAskHumanCommandOrchestrationInvocation({
    commandInput: input,
    runtimeDependencies: dependencies,
    createError: createAskHumanCommandError
  });

  return orchestrateAskHumanCommand(
    invocation.orchestrationInput,
    invocation.orchestrationDependencies
  );
}

export function asAskHumanCommandError(error: unknown): never {
  return throwAsAskHumanCommandError(error);
}
