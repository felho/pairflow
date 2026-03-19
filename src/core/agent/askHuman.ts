import {
  WorkspaceResolutionError
} from "../bubble/workspaceResolution.js";
import { emitBubbleNotification } from "../runtime/notifications.js";
import { emitTmuxDeliveryNotification } from "../runtime/tmuxDelivery.js";
import { executeAskHumanExecution } from "../../v11/application/askHuman/askHumanExecution.js";
import { finalizeAskHumanFlow } from "../../v11/application/askHuman/askHumanFinalization.js";
import { runAskHumanFlow } from "../../v11/application/askHuman/runAskHumanFlow.js";
import { prepareAskHumanRouting } from "../../v11/application/askHuman/askHumanRoutingPreparation.js";
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
  const routing = await prepareAskHumanRouting({
    question: input.question,
    ...(input.refs !== undefined
      ? { refs: input.refs }
      : {}),
    ...(input.cwd !== undefined
      ? { cwd: input.cwd }
      : {}),
    now,
    createError: (message) => new AskHumanCommandError(message)
  });

  return runAskHumanFlow(
    {
      now,
      routing,
      createError: (message) => new AskHumanCommandError(message)
    },
    {
      executeAskHumanExecution,
      finalizeAskHumanFlow,
      ...(dependencies.emitTmuxDeliveryNotification !== undefined
        ? { emitTmuxDeliveryNotification: dependencies.emitTmuxDeliveryNotification }
        : { emitTmuxDeliveryNotification }),
      ...(dependencies.emitBubbleNotification !== undefined
        ? { emitBubbleNotification: dependencies.emitBubbleNotification }
        : { emitBubbleNotification })
    }
  );
}

export function asAskHumanCommandError(error: unknown): never {
  if (error instanceof AskHumanCommandError) {
    throw error;
  }

  if (error instanceof WorkspaceResolutionError) {
    throw new AskHumanCommandError(error.message);
  }

  if (error instanceof Error) {
    throw new AskHumanCommandError(error.message);
  }

  throw error;
}
