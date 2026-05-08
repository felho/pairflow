import type {
  EmitAskHumanDependencies,
  EmitAskHumanInput,
  EmitAskHumanResult
} from "./askHumanCommandContract.js";
import { createAskHumanCommandError } from "./askHumanCommandRuntime.js";
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
export { throwAsAskHumanCommandError as asAskHumanCommandError } from "./askHumanCommandRuntime.js";
export { AskHumanCommandError } from "./askHumanCommandRuntime.js";
export type {
  EmitAskHumanDependencies,
  EmitAskHumanInput,
  EmitAskHumanResult
} from "./askHumanCommandContract.js";
