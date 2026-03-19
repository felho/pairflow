import type { emitBubbleNotification } from "../runtime/notifications.js";
import type { emitTmuxDeliveryNotification } from "../runtime/tmuxDelivery.js";
import { executeAskHumanExecution } from "../../v11/application/askHuman/askHumanExecution.js";
import { finalizeAskHumanFlow } from "../../v11/application/askHuman/askHumanFinalization.js";
import { runAskHumanFlow } from "../../v11/application/askHuman/runAskHumanFlow.js";
import { prepareAskHumanRouting } from "../../v11/application/askHuman/askHumanRoutingPreparation.js";
import {
  buildAskHumanFlowDependencies,
  buildAskHumanFlowInput,
  buildAskHumanRoutingInput
} from "../../v11/shared/askHuman/askHumanFlowInvocationBuilders.js";
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

export async function emitAskHumanFromWorkspace(
  input: EmitAskHumanInput,
  dependencies: EmitAskHumanDependencies = {}
): Promise<EmitAskHumanResult> {
  const now = input.now ?? new Date();
  const createError = (message: string): AskHumanCommandError =>
    new AskHumanCommandError(message);
  const routing = await prepareAskHumanRouting(
    buildAskHumanRoutingInput({
      question: input.question,
      refs: input.refs,
      cwd: input.cwd,
      now,
      createError
    })
  );

  return runAskHumanFlow(
    buildAskHumanFlowInput({
      now,
      routing,
      createError
    }),
    buildAskHumanFlowDependencies({
      executeAskHumanExecution,
      finalizeAskHumanFlow,
      ...(dependencies.emitTmuxDeliveryNotification !== undefined
        ? { emitTmuxDeliveryNotification: dependencies.emitTmuxDeliveryNotification }
        : {}),
      ...(dependencies.emitBubbleNotification !== undefined
        ? { emitBubbleNotification: dependencies.emitBubbleNotification }
        : {})
    })
  );
}

export function asAskHumanCommandError(error: unknown): never {
  if (error instanceof AskHumanCommandError) {
    throw error;
  }

  if (error instanceof Error) {
    throw new AskHumanCommandError(error.message);
  }

  throw error;
}
