import type {
  EmitAskHumanDependencies,
  EmitAskHumanInput,
  EmitAskHumanResult
} from "./askHumanCommandContract.js";
import {
  createAskHumanCommandError,
  throwAsAskHumanCommandError
} from "./askHumanCommandRuntime.js";
import { dispatchAskHumanCommandOrchestration } from "./askHumanCommandOrchestrationDispatch.js";

export async function emitAskHumanFromWorkspace(
  input: EmitAskHumanInput,
  dependencies: EmitAskHumanDependencies = {}
): Promise<EmitAskHumanResult> {
  return dispatchAskHumanCommandOrchestration(
    input,
    dependencies,
    createAskHumanCommandError
  );
}

export function asAskHumanCommandError(error: unknown): never {
  return throwAsAskHumanCommandError(error);
}
