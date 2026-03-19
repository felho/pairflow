import { normalizeStringList, requireNonEmptyString } from "../util/normalize.js";
import { WorkspaceResolutionError } from "../bubble/workspaceResolution.js";
import {
  toMetaReviewGateError,
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
import { prepareConvergedRouting } from "../../v11/application/converged/convergedRoutingPreparation.js";
import { prepareConvergedPolicy } from "../../v11/application/converged/convergedPolicyPreparation.js";
import { prepareConvergedValidation } from "../../v11/application/converged/convergedValidationPreparation.js";
import { executeConvergedExecution } from "../../v11/application/converged/convergedExecution.js";
import { finalizeConvergedFlow } from "../../v11/application/converged/convergedFinalization.js";
import {
  resolveMetaReviewRolloutBlockingReasonCodesV11
} from "../../v11/application/converged/metaReviewRolloutBlockingReasonCodes.js";
import {
  buildConvergedFlowDependencies,
  buildConvergedFlowInput
} from "../../v11/shared/converged/convergedFlowInvocationBuilders.js";

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
  return resolveMetaReviewRolloutBlockingReasonCodesV11(input);
}

export async function emitConvergedFromWorkspace(
  input: EmitConvergedInput,
  dependencies: EmitConvergedDependencies = {}
): Promise<EmitConvergedResult> {
  const now = input.now ?? new Date();
  const createError = (message: string): ConvergedCommandError =>
    new ConvergedCommandError(message);
  const summary = requireNonEmptyString(
    input.summary,
    "Convergence summary",
    createError
  );
  const refs = normalizeStringList(input.refs ?? []);
  return runConvergedFlow(
    buildConvergedFlowInput({
      summary,
      refs,
      now,
      ...(input.cwd !== undefined
        ? { cwd: input.cwd }
        : {}),
      ...(input.expectedStateFingerprint !== undefined
        ? { expectedStateFingerprint: input.expectedStateFingerprint }
        : {}),
      ...(input.expectedRound !== undefined
        ? { expectedRound: input.expectedRound }
        : {}),
      ...(input.expectedReviewer !== undefined
        ? { expectedReviewer: input.expectedReviewer }
        : {}),
      createError,
      resolveMetaReviewRolloutBlockingReasonCodes
    }),
    buildConvergedFlowDependencies({
      prepareConvergedRouting,
      prepareConvergedPolicy,
      prepareConvergedValidation,
      executeConvergedExecution,
      finalizeConvergedFlow,
      ...(dependencies.applyMetaReviewGateOnConvergence !== undefined
        ? {
            applyMetaReviewGateOnConvergence:
              dependencies.applyMetaReviewGateOnConvergence
          }
        : {}),
      ...(dependencies.recoverMetaReviewGateFromSnapshot !== undefined
        ? {
            recoverMetaReviewGateFromSnapshot:
              dependencies.recoverMetaReviewGateFromSnapshot
          }
        : {}),
      ...(dependencies.emitTmuxDeliveryNotification !== undefined
        ? {
            emitTmuxDeliveryNotification:
              dependencies.emitTmuxDeliveryNotification
          }
        : {}),
      ...(dependencies.emitBubbleNotification !== undefined
        ? { emitBubbleNotification: dependencies.emitBubbleNotification }
        : {})
    })
  );
}

export function asConvergedCommandError(error: unknown): never {
  if (error instanceof ConvergedCommandError) {
    throw error;
  }

  if (error instanceof WorkspaceResolutionError) {
    throw new ConvergedCommandError(error.message);
  }

  if (error instanceof Error && error.name === "MetaReviewGateError") {
    const gateError = toMetaReviewGateError(error);
    throw new ConvergedCommandError(gateError.message);
  }

  if (error instanceof Error) {
    throw new ConvergedCommandError(error.message);
  }

  throw error;
}
