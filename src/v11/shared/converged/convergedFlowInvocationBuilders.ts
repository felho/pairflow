import type { AgentName } from "../../../types/bubble.js";
import type { ConvergedStructuredFinding } from "./convergedCommandTypes.js";
import { executeConvergedExecution } from "../../application/converged/convergedExecution.js";
import { finalizeConvergedFlow } from "../../application/converged/convergedFinalization.js";
import { prepareConvergedPolicy } from "../../application/converged/convergedPolicyPreparation.js";
import { prepareConvergedRouting } from "../../application/converged/convergedRoutingPreparation.js";
import { prepareConvergedValidation } from "../../application/converged/convergedValidationPreparation.js";
import type {
  RunConvergedFlowDependencies,
  RunConvergedFlowInput
} from "../../application/converged/runConvergedFlow.js";

export interface BuildConvergedFlowInputInput {
  summary: string;
  refs: string[];
  findings?: ConvergedStructuredFinding[] | undefined;
  now: Date;
  cwd?: string | undefined;
  expectedStateFingerprint?: string | undefined;
  expectedRound?: number | undefined;
  expectedReviewer?: AgentName | undefined;
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
    ...(input.findings !== undefined && input.findings.length > 0
      ? { findings: input.findings }
      : {}),
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

export interface BuildDefaultConvergedFlowDependenciesInput {
  applyMetaReviewGateOnConvergence?:
    RunConvergedFlowDependencies["applyMetaReviewGateOnConvergence"];
  recoverMetaReviewGateFromSnapshot?:
    RunConvergedFlowDependencies["recoverMetaReviewGateFromSnapshot"];
  emitTmuxDeliveryNotification?:
    RunConvergedFlowDependencies["emitTmuxDeliveryNotification"];
  emitBubbleNotification?:
    RunConvergedFlowDependencies["emitBubbleNotification"];
}

export function buildDefaultConvergedFlowDependencies(
  input: BuildDefaultConvergedFlowDependenciesInput = {}
): RunConvergedFlowDependencies {
  return buildConvergedFlowDependencies({
    prepareConvergedRouting,
    prepareConvergedPolicy,
    prepareConvergedValidation,
    executeConvergedExecution,
    finalizeConvergedFlow,
    applyMetaReviewGateOnConvergence: input.applyMetaReviewGateOnConvergence,
    recoverMetaReviewGateFromSnapshot: input.recoverMetaReviewGateFromSnapshot,
    emitTmuxDeliveryNotification: input.emitTmuxDeliveryNotification,
    emitBubbleNotification: input.emitBubbleNotification
  });
}

export interface BuildConvergedCommandFlowInvocationInput {
  summary: string;
  refs: string[];
  findings?: ConvergedStructuredFinding[] | undefined;
  now: Date;
  cwd?: string | undefined;
  expectedStateFingerprint?: string | undefined;
  expectedRound?: number | undefined;
  expectedReviewer?: AgentName | undefined;
  createError: RunConvergedFlowInput["createError"];
  resolveMetaReviewRolloutBlockingReasonCodes:
    RunConvergedFlowInput["resolveMetaReviewRolloutBlockingReasonCodes"];
  dependencies?: BuildDefaultConvergedFlowDependenciesInput | undefined;
}

export interface BuildConvergedCommandFlowInvocationResult {
  flowInput: RunConvergedFlowInput;
  flowDependencies: RunConvergedFlowDependencies;
}

export function buildConvergedCommandFlowInvocation(
  input: BuildConvergedCommandFlowInvocationInput
): BuildConvergedCommandFlowInvocationResult {
  return {
    flowInput: buildConvergedFlowInput({
      summary: input.summary,
      refs: input.refs,
      findings: input.findings,
      now: input.now,
      cwd: input.cwd,
      expectedStateFingerprint: input.expectedStateFingerprint,
      expectedRound: input.expectedRound,
      expectedReviewer: input.expectedReviewer,
      createError: input.createError,
      resolveMetaReviewRolloutBlockingReasonCodes:
        input.resolveMetaReviewRolloutBlockingReasonCodes
    }),
    flowDependencies: buildDefaultConvergedFlowDependencies(
      input.dependencies ?? {}
    )
  };
}
