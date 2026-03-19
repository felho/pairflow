import type {
  EmitAskHumanDependencies,
  EmitAskHumanInput,
  EmitAskHumanResult
} from "./askHumanCommandContract.js";
import {
  createAskHumanCommandError,
  throwAsAskHumanCommandError
} from "./askHumanCommandRuntime.js";
import { normalizeAskHumanCommandInput } from "./askHumanCommandInputNormalization.js";
import { buildAskHumanEntrypointInvocation } from "./askHumanEntrypointInvocationBuilder.js";
import { orchestrateAskHumanCommand } from "./askHumanCommandOrchestration.js";
import { createAskHumanCommandOrchestrationDependencies } from "./askHumanFlowDependencyWiring.js";

export async function emitAskHumanFromWorkspace(
  input: EmitAskHumanInput,
  dependencies: EmitAskHumanDependencies = {}
): Promise<EmitAskHumanResult> {
  const normalizedInput = normalizeAskHumanCommandInput({
    question: input.question,
    refs: input.refs,
    cwd: input.cwd,
    now: input.now
  });

  return orchestrateAskHumanCommand(
    buildAskHumanEntrypointInvocation({
      normalizedInput,
      createError: createAskHumanCommandError
    }),
    createAskHumanCommandOrchestrationDependencies({
      emitTmuxDeliveryNotification: dependencies.emitTmuxDeliveryNotification,
      emitBubbleNotification: dependencies.emitBubbleNotification
    })
  );
}

export function asAskHumanCommandError(error: unknown): never {
  return throwAsAskHumanCommandError(error);
}
