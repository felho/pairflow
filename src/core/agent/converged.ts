import {
  type MetaReviewGateRoute
} from "../bubble/metaReviewGate.js";
import type { PairflowCommandPathAssessment } from "../runtime/pairflowCommand.js";
import type {
  AgentName,
  BubbleStateSnapshot
} from "../../types/bubble.js";
import { type ProtocolEnvelope } from "../../types/protocol.js";
import {
  runConvergedFlow,
  type RunConvergedFlowDependencies
} from "../../v11/application/converged/runConvergedFlow.js";
import {
  buildDefaultConvergedFlowDependencies,
  buildConvergedFlowInput,
} from "../../v11/shared/converged/convergedFlowInvocationBuilders.js";
import { normalizeConvergedCommandError } from "../../v11/shared/converged/convergedCommandErrorNormalization.js";
import { normalizeConvergedCommandInput } from "../../v11/shared/converged/convergedCommandInputNormalization.js";
import { resolveConvergedRolloutBlockingReasonCodes } from "../../v11/shared/converged/convergedRolloutBlockingReasonResolver.js";

export interface EmitConvergedInput {
  summary: string;
  refs?: string[];
  cwd?: string;
  now?: Date;
  expectedStateFingerprint?: string;
  expectedRound?: number;
  expectedReviewer?: AgentName;
}

export interface EmitConvergedDependencies {
  emitTmuxDeliveryNotification?: RunConvergedFlowDependencies["emitTmuxDeliveryNotification"];
  emitBubbleNotification?: RunConvergedFlowDependencies["emitBubbleNotification"];
  applyMetaReviewGateOnConvergence?: RunConvergedFlowDependencies["applyMetaReviewGateOnConvergence"];
  recoverMetaReviewGateFromSnapshot?: RunConvergedFlowDependencies["recoverMetaReviewGateFromSnapshot"];
}

export interface EmitConvergedResult {
  bubbleId: string;
  convergenceSequence: number;
  convergenceEnvelope: ProtocolEnvelope;
  gateRoute: MetaReviewGateRoute;
  approvalRequestSequence: number;
  approvalRequestEnvelope: ProtocolEnvelope;
  state: BubbleStateSnapshot;
  delivery?: {
    delivered: boolean;
    reason?: string;
    retried: boolean;
  };
}

export class ConvergedCommandError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "ConvergedCommandError";
  }
}

export function resolveMetaReviewRolloutBlockingReasonCodes(input: {
  gateRoute: MetaReviewGateRoute;
  metaReviewWarnings: Array<{ reason_code: string }>;
  commandPathStatus: PairflowCommandPathAssessment;
}): string[] {
  return resolveConvergedRolloutBlockingReasonCodes(input);
}

export async function emitConvergedFromWorkspace(
  input: EmitConvergedInput,
  dependencies: EmitConvergedDependencies = {}
): Promise<EmitConvergedResult> {
  const createError = (message: string): ConvergedCommandError =>
    new ConvergedCommandError(message);
  const normalized = normalizeConvergedCommandInput({
    summary: input.summary,
    refs: input.refs,
    now: input.now,
    createError
  });
  return runConvergedFlow(
    buildConvergedFlowInput({
      summary: normalized.summary,
      refs: normalized.refs,
      now: normalized.now,
      cwd: input.cwd,
      expectedStateFingerprint: input.expectedStateFingerprint,
      expectedRound: input.expectedRound,
      expectedReviewer: input.expectedReviewer,
      createError,
      resolveMetaReviewRolloutBlockingReasonCodes
    }),
    buildDefaultConvergedFlowDependencies({
      applyMetaReviewGateOnConvergence:
        dependencies.applyMetaReviewGateOnConvergence,
      recoverMetaReviewGateFromSnapshot:
        dependencies.recoverMetaReviewGateFromSnapshot,
      emitTmuxDeliveryNotification: dependencies.emitTmuxDeliveryNotification,
      emitBubbleNotification: dependencies.emitBubbleNotification
    })
  );
}

export function asConvergedCommandError(error: unknown): never {
  throw normalizeConvergedCommandError({
    error,
    isConvergedCommandError: (candidate) => candidate instanceof ConvergedCommandError,
    createConvergedCommandError: (message) => new ConvergedCommandError(message)
  });
}
