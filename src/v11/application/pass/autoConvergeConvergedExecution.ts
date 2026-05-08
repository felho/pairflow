import type { AgentName } from "../../../contracts/kernel/agentIdentity.js";
import type {
  EmitConvergedDependencies,
  EmitConvergedResult
} from "../converged/convergedCommandOrchestration.js";

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
  emitBubbleNotification?: EmitConvergedDependencies["emitBubbleNotification"];
}

function resolveAutoConvergeDeliveryOverride(
  dependencies: ExecuteAutoConvergeConvergedDependencies
): EmitConvergedDependencies["emitDeliveryNotificationAck"] | undefined {
  return dependencies.emitDeliveryNotificationAck;
}

export async function executeAutoConvergeConverged(
  input: ExecuteAutoConvergeConvergedInput,
  dependencies: ExecuteAutoConvergeConvergedDependencies
): Promise<EmitConvergedResult> {
  const emitDeliveryNotificationAck =
    resolveAutoConvergeDeliveryOverride(dependencies);

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
        ...(emitDeliveryNotificationAck !== undefined
          ? { emitDeliveryNotificationAck }
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
