import type { AgentName } from "../../../types/bubble.js";
import type {
  EmitConvergedDependencies,
  EmitConvergedResult
} from "../../../core/agent/converged.js";

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
