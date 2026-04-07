import type {
  EmitAskHumanDependencies,
  EmitAskHumanInput,
  EmitAskHumanResult
} from "../../shared/askHuman/askHumanCommandContract.js";
import { buildAskHumanCommandDispatchInput } from "../../shared/askHuman/askHumanCommandDispatchInputBuilder.js";
import { createAskHumanCommandError } from "../../shared/askHuman/askHumanCommandRuntime.js";
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
export { throwAsAskHumanCommandError as asAskHumanCommandError } from "../../shared/askHuman/askHumanCommandRuntime.js";
