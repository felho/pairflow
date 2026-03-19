import type { AgentName } from "../../../types/bubble.js";
import type {
  RunConvergedFlowDependencies,
  RunConvergedFlowInput
} from "../../application/converged/runConvergedFlow.js";

export interface BuildConvergedFlowInputInput {
  summary: string;
  refs: string[];
  now: Date;
  cwd?: string;
  expectedStateFingerprint?: string;
  expectedRound?: number;
  expectedReviewer?: AgentName;
  createError: RunConvergedFlowInput["createError"];
  resolveMetaReviewRolloutBlockingReasonCodes:
    RunConvergedFlowInput["resolveMetaReviewRolloutBlockingReasonCodes"];
}

export function buildConvergedFlowInput(
  input: BuildConvergedFlowInputInput
): RunConvergedFlowInput {
  return {
    summary: input.summary,
    refs: input.refs,
    now: input.now,
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
    createError: input.createError,
    resolveMetaReviewRolloutBlockingReasonCodes:
      input.resolveMetaReviewRolloutBlockingReasonCodes
  };
}

export interface BuildConvergedFlowDependenciesInput {
  prepareConvergedRouting:
    RunConvergedFlowDependencies["prepareConvergedRouting"];
  prepareConvergedPolicy: RunConvergedFlowDependencies["prepareConvergedPolicy"];
  prepareConvergedValidation:
    RunConvergedFlowDependencies["prepareConvergedValidation"];
  executeConvergedExecution:
    RunConvergedFlowDependencies["executeConvergedExecution"];
  finalizeConvergedFlow: RunConvergedFlowDependencies["finalizeConvergedFlow"];
  applyMetaReviewGateOnConvergence?:
    RunConvergedFlowDependencies["applyMetaReviewGateOnConvergence"];
  recoverMetaReviewGateFromSnapshot?:
    RunConvergedFlowDependencies["recoverMetaReviewGateFromSnapshot"];
  emitTmuxDeliveryNotification?:
    RunConvergedFlowDependencies["emitTmuxDeliveryNotification"];
  emitBubbleNotification?:
    RunConvergedFlowDependencies["emitBubbleNotification"];
}

export function buildConvergedFlowDependencies(
  input: BuildConvergedFlowDependenciesInput
): RunConvergedFlowDependencies {
  return {
    prepareConvergedRouting: input.prepareConvergedRouting,
    prepareConvergedPolicy: input.prepareConvergedPolicy,
    prepareConvergedValidation: input.prepareConvergedValidation,
    executeConvergedExecution: input.executeConvergedExecution,
    finalizeConvergedFlow: input.finalizeConvergedFlow,
    ...(input.applyMetaReviewGateOnConvergence !== undefined
      ? {
          applyMetaReviewGateOnConvergence:
            input.applyMetaReviewGateOnConvergence
        }
      : {}),
    ...(input.recoverMetaReviewGateFromSnapshot !== undefined
      ? {
          recoverMetaReviewGateFromSnapshot:
            input.recoverMetaReviewGateFromSnapshot
        }
      : {}),
    ...(input.emitTmuxDeliveryNotification !== undefined
      ? { emitTmuxDeliveryNotification: input.emitTmuxDeliveryNotification }
      : {}),
    ...(input.emitBubbleNotification !== undefined
      ? { emitBubbleNotification: input.emitBubbleNotification }
      : {})
  };
}
