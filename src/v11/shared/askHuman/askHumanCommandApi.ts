import type {
  EmitAskHumanDependencies,
  EmitAskHumanInput,
  EmitAskHumanResult
} from "./askHumanCommandContract.js";
import { buildAskHumanCommandDispatchInput } from "./askHumanCommandDispatchInputBuilder.js";
import { createAskHumanCommandError } from "./askHumanCommandRuntime.js";
import { dispatchAskHumanCommandOrchestration } from "./askHumanCommandOrchestrationDispatch.js";

export async function emitAskHumanFromWorkspace(
  input: EmitAskHumanInput,
  dependencies: EmitAskHumanDependencies = {}
): Promise<EmitAskHumanResult> {
  const dispatchInput = buildAskHumanCommandDispatchInput(
    input,
    dependencies,
    createAskHumanCommandError
  );

  return dispatchAskHumanCommandOrchestration(
    dispatchInput.input,
    dispatchInput.dependencies,
    dispatchInput.createError
  );
}
export { throwAsAskHumanCommandError as asAskHumanCommandError } from "./askHumanCommandRuntime.js";
