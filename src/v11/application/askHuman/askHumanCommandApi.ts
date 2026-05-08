import type {
  EmitAskHumanDependencies,
  EmitAskHumanInput,
  EmitAskHumanResult
} from "./askHumanCommandContract.js";
import { createAskHumanCommandError } from "./internal/mutation/askHumanCommandRuntime.js";
import { dispatchAskHumanCommandOrchestration } from "./internal/mutation/askHumanCommandOrchestrationDispatch.js";

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
export { throwAsAskHumanCommandError as asAskHumanCommandError } from "./internal/mutation/askHumanCommandRuntime.js";
export { AskHumanCommandError } from "./internal/mutation/askHumanCommandRuntime.js";
export type {
  EmitAskHumanDependencies,
  EmitAskHumanInput,
  EmitAskHumanResult
} from "./askHumanCommandContract.js";
