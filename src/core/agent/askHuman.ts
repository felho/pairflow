import type { emitBubbleNotification } from "../runtime/notifications.js";
import type { emitTmuxDeliveryNotification } from "../runtime/tmuxDelivery.js";
import { normalizeAskHumanCommandError } from "../../v11/shared/askHuman/askHumanCommandErrorNormalization.js";
import { buildAskHumanCommandErrorFactory } from "../../v11/shared/askHuman/askHumanCommandErrorFactory.js";
import { normalizeAskHumanCommandInput } from "../../v11/shared/askHuman/askHumanCommandInputNormalization.js";
import { orchestrateAskHumanCommand } from "../../v11/shared/askHuman/askHumanCommandOrchestration.js";
import { createAskHumanCommandOrchestrationDependencies } from "../../v11/shared/askHuman/askHumanFlowDependencyWiring.js";
import type { BubbleStateSnapshot } from "../../types/bubble.js";
import type { ProtocolEnvelope } from "../../types/protocol.js";

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

export class AskHumanCommandError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "AskHumanCommandError";
  }
}

const createAskHumanCommandError = buildAskHumanCommandErrorFactory({
  createAskHumanCommandError: (message) => new AskHumanCommandError(message)
});

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
    {
      question: normalizedInput.question,
      refs: normalizedInput.refs,
      cwd: normalizedInput.cwd,
      now: normalizedInput.now,
      createError: createAskHumanCommandError
    },
    createAskHumanCommandOrchestrationDependencies({
      emitTmuxDeliveryNotification: dependencies.emitTmuxDeliveryNotification,
      emitBubbleNotification: dependencies.emitBubbleNotification
    })
  );
}

export function asAskHumanCommandError(error: unknown): never {
  throw normalizeAskHumanCommandError({
    error,
    isAskHumanCommandError: (candidate) => candidate instanceof AskHumanCommandError,
    createAskHumanCommandError
  });
}
