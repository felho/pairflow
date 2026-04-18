import type { AgentName } from "../../../types/bubble.js";
import type {
  EmitConvergedV11Dependencies as EmitConvergedDependencies,
  EmitConvergedV11Result as EmitConvergedResult
} from "../converged/emitConvergedV11.js";

export interface ExecuteAutoConvergeConvergedInput {
  summary: string;
  refs: string[];
  cwd: string;
  now: Date;
  expectedStateFingerprint: string;
  expectedRound: number;
  expectedReviewer: AgentName;
  onDownstreamRejected: (reason: string) => never;
}

export interface ExecuteAutoConvergeConvergedDependencies {
  emitConvergedFromWorkspace: (
    input: {
      summary: string;
      refs?: string[];
      cwd?: string;
      now?: Date;
      expectedStateFingerprint?: string;
      expectedRound?: number;
      expectedReviewer?: AgentName;
    },
    dependencies?: EmitConvergedDependencies
  ) => Promise<EmitConvergedResult>;
  emitDeliveryNotificationAck?: EmitConvergedDependencies["emitDeliveryNotificationAck"];
  emitTmuxDeliveryNotification?: EmitConvergedDependencies["emitTmuxDeliveryNotification"];
  emitBubbleNotification?: EmitConvergedDependencies["emitBubbleNotification"];
}

export async function executeAutoConvergeConverged(
  input: ExecuteAutoConvergeConvergedInput,
  dependencies: ExecuteAutoConvergeConvergedDependencies
): Promise<EmitConvergedResult> {
  try {
    return await dependencies.emitConvergedFromWorkspace(
      {
        summary: input.summary,
        refs: input.refs,
        cwd: input.cwd,
        now: input.now,
        expectedStateFingerprint: input.expectedStateFingerprint,
        expectedRound: input.expectedRound,
        expectedReviewer: input.expectedReviewer
      },
      {
        ...(dependencies.emitDeliveryNotificationAck !== undefined
          ? {
              emitDeliveryNotificationAck:
                dependencies.emitDeliveryNotificationAck
            }
          : {}),
        ...(dependencies.emitTmuxDeliveryNotification !== undefined
          ? { emitTmuxDeliveryNotification: dependencies.emitTmuxDeliveryNotification }
          : {}),
        ...(dependencies.emitBubbleNotification !== undefined
          ? { emitBubbleNotification: dependencies.emitBubbleNotification }
          : {})
      }
    );
  } catch (error) {
    const reason =
      error instanceof Error
        ? (((error as Error & { detailMessage?: string }).detailMessage)
          ?? error.message)
        : String(error);
    return input.onDownstreamRejected(reason);
  }
}
