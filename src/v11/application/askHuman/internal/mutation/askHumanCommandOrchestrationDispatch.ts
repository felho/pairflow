import type {
  EmitAskHumanDependencies,
  EmitAskHumanInput,
  EmitAskHumanResult
} from "../../askHumanCommandContract.js";
import { normalizeAskHumanCommandInput } from "./askHumanCommandInputNormalization.js";
import { createAskHumanCommandOrchestrationDependencies } from "../delivery/askHumanFlowDependencyWiring.js";
import { orchestrateAskHumanCommand } from "./askHumanCommandOrchestration.js";

export async function dispatchAskHumanCommandOrchestration(
  input: EmitAskHumanInput,
  dependencies: EmitAskHumanDependencies,
  createError: PairflowCreateCommandError
): Promise<EmitAskHumanResult> {
  const normalizedInput = normalizeAskHumanCommandInput(input);

  return orchestrateAskHumanCommand(
    {
      question: normalizedInput.question,
      refs: normalizedInput.refs,
      cwd: normalizedInput.cwd,
      authoritativeContext: normalizedInput.authoritativeContext,
      now: normalizedInput.now,
      createError
    },
    createAskHumanCommandOrchestrationDependencies(dependencies)
  );
}
