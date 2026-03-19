import type {
  EmitAskHumanDependencies,
  EmitAskHumanInput,
  EmitAskHumanResult
} from "./askHumanCommandContract.js";
import {
  createAskHumanCommandError,
  throwAsAskHumanCommandError
} from "./askHumanCommandRuntime.js";
import { buildAskHumanCommandContext } from "./askHumanCommandContextBuilder.js";
import { orchestrateAskHumanCommand } from "./askHumanCommandOrchestration.js";
import { createAskHumanCommandOrchestrationDependencies } from "./askHumanFlowDependencyWiring.js";

export async function emitAskHumanFromWorkspace(
  input: EmitAskHumanInput,
  dependencies: EmitAskHumanDependencies = {}
): Promise<EmitAskHumanResult> {
  const context = buildAskHumanCommandContext({
    commandInput: input,
    createError: createAskHumanCommandError
  });

  return orchestrateAskHumanCommand(
    context.orchestrationInput,
    createAskHumanCommandOrchestrationDependencies({
      emitTmuxDeliveryNotification: dependencies.emitTmuxDeliveryNotification,
      emitBubbleNotification: dependencies.emitBubbleNotification
    })
  );
}

export function asAskHumanCommandError(error: unknown): never {
  return throwAsAskHumanCommandError(error);
}
