import {
  AskHumanCommandError,
  createAskHumanCommandError,
  throwAsAskHumanCommandError
} from "../../v11/shared/askHuman/askHumanCommandRuntime.js";
import type {
  EmitAskHumanDependencies,
  EmitAskHumanInput,
  EmitAskHumanResult
} from "../../v11/application/askHuman/askHumanCommandContract.js";
import { normalizeAskHumanCommandInput } from "../../v11/shared/askHuman/askHumanCommandInputNormalization.js";
import { buildAskHumanEntrypointInvocation } from "../../v11/shared/askHuman/askHumanEntrypointInvocationBuilder.js";
import { orchestrateAskHumanCommand } from "../../v11/shared/askHuman/askHumanCommandOrchestration.js";
import { createAskHumanCommandOrchestrationDependencies } from "../../v11/shared/askHuman/askHumanFlowDependencyWiring.js";
export { AskHumanCommandError };
export type {
  EmitAskHumanDependencies,
  EmitAskHumanInput,
  EmitAskHumanResult
};

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
