import type { emitBubbleNotification } from "../runtime/notifications.js";
import type { emitTmuxDeliveryNotification } from "../runtime/tmuxDelivery.js";
import {
  AskHumanCommandError,
  createAskHumanCommandError,
  throwAsAskHumanCommandError
} from "../../v11/shared/askHuman/askHumanCommandRuntime.js";
import { normalizeAskHumanCommandInput } from "../../v11/shared/askHuman/askHumanCommandInputNormalization.js";
import { buildAskHumanEntrypointInvocation } from "../../v11/shared/askHuman/askHumanEntrypointInvocationBuilder.js";
import { orchestrateAskHumanCommand } from "../../v11/shared/askHuman/askHumanCommandOrchestration.js";
import { createAskHumanCommandOrchestrationDependencies } from "../../v11/shared/askHuman/askHumanFlowDependencyWiring.js";
import type { BubbleStateSnapshot } from "../../types/bubble.js";
import type { ProtocolEnvelope } from "../../types/protocol.js";
export { AskHumanCommandError };

export interface EmitAskHumanInput {
  question: string;
  refs?: string[];
  cwd?: string;
  now?: Date;
}

export interface EmitAskHumanResult {
  bubbleId: string;
  sequence: number;
  envelope: ProtocolEnvelope;
  state: BubbleStateSnapshot;
  inferredRecipient: "human";
}

export interface EmitAskHumanDependencies {
  emitTmuxDeliveryNotification?: typeof emitTmuxDeliveryNotification;
  emitBubbleNotification?: typeof emitBubbleNotification;
}

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
