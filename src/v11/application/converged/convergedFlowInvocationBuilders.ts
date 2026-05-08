import type { AgentName } from "../../../types/bubble.js";
import type { ActorEmitContextSnapshot } from "../../shared/actorProtocol/actorEmitContext.js";
import type { ConvergedStructuredFinding } from "../../shared/converged/convergedCommandTypes.js";
import { executeConvergedExecution } from "./convergedExecution.js";
import { finalizeConvergedFlow } from "./convergedFinalization.js";
import { prepareConvergedPolicy } from "./convergedPolicyPreparation.js";
import { prepareConvergedRouting } from "./convergedRoutingPreparation.js";
import { prepareConvergedValidation } from "./convergedValidationPreparation.js";
import { resolveDefaultConvergedReadTranscriptEnvelopes } from "./convergedDefaultDependencies.js";
import type { ReadTranscriptEnvelopesPort } from "../../ports/transcript.js";
import type {
  ResolveReviewerTestExecutionDirectivePort
} from "../../ports/reviewerTestEvidenceArtifacts.js";
import type {
  RunConvergedFlowDependencies,
  RunConvergedFlowInput
} from "./runConvergedFlow.js";

export {
  buildDefaultConvergedExecutionDependencies,
  buildDefaultConvergedGateDeliveryDependencies
} from "./convergedDefaultDependencies.js";

export interface BuildConvergedFlowInputInput {
  summary: string;
  refs: string[];
  findings?: ConvergedStructuredFinding[] | undefined;
  now: Date;
  cwd?: string | undefined;
  authoritativeContext?: ActorEmitContextSnapshot | undefined;
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
    ...(input.authoritativeContext !== undefined
      ? { authoritativeContext: input.authoritativeContext }
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
  prepareConvergedPolicy: typeof prepareConvergedPolicy;
  prepareConvergedValidation:
    RunConvergedFlowDependencies["prepareConvergedValidation"];
  executeConvergedExecution:
    RunConvergedFlowDependencies["executeConvergedExecution"];
  finalizeConvergedFlow: RunConvergedFlowDependencies["finalizeConvergedFlow"];
  resolveReviewerTestExecutionDirective?:
    ResolveReviewerTestExecutionDirectivePort | undefined;
  applyMetaReviewGateOnConvergence?:
    RunConvergedFlowDependencies["applyMetaReviewGateOnConvergence"];
  emitDeliveryNotificationAck?:
    RunConvergedFlowDependencies["emitDeliveryNotificationAck"];
  emitBubbleNotification?:
    RunConvergedFlowDependencies["emitBubbleNotification"];
  readTranscriptEnvelopes?: ReadTranscriptEnvelopesPort;
}

function resolveConvergedDeliveryOverride(input: {
  emitDeliveryNotificationAck?:
    RunConvergedFlowDependencies["emitDeliveryNotificationAck"];
}): RunConvergedFlowDependencies["emitDeliveryNotificationAck"] | undefined {
  return input.emitDeliveryNotificationAck;
}

export function buildConvergedFlowDependencies(
  input: BuildConvergedFlowDependenciesInput
): RunConvergedFlowDependencies {
  const emitDeliveryNotificationAck =
    resolveConvergedDeliveryOverride(input);

  return {
    prepareConvergedRouting: input.prepareConvergedRouting,
    prepareConvergedPolicy: (policyInput) =>
      input.prepareConvergedPolicy(policyInput, {
        ...(input.readTranscriptEnvelopes !== undefined
          ? { readTranscriptEnvelopes: input.readTranscriptEnvelopes }
          : {
              readTranscriptEnvelopes:
                resolveDefaultConvergedReadTranscriptEnvelopes()
            })
      }),
    prepareConvergedValidation: (validationInput, dependencies) =>
      input.prepareConvergedValidation(validationInput, {
        ...(dependencies?.resolveReviewerTestExecutionDirective !== undefined
          ? {
              resolveReviewerTestExecutionDirective:
                dependencies.resolveReviewerTestExecutionDirective
            }
          : input.resolveReviewerTestExecutionDirective !== undefined
            ? {
                resolveReviewerTestExecutionDirective:
                  input.resolveReviewerTestExecutionDirective
              }
            : {})
      }),
    executeConvergedExecution: input.executeConvergedExecution,
    finalizeConvergedFlow: input.finalizeConvergedFlow,
    ...(input.applyMetaReviewGateOnConvergence !== undefined
      ? {
          applyMetaReviewGateOnConvergence:
            input.applyMetaReviewGateOnConvergence
        }
      : {}),
    ...(emitDeliveryNotificationAck !== undefined
      ? { emitDeliveryNotificationAck }
      : {}),
    ...(input.emitBubbleNotification !== undefined
      ? { emitBubbleNotification: input.emitBubbleNotification }
      : {})
  };
}

export interface BuildDefaultConvergedFlowDependenciesInput {
  applyMetaReviewGateOnConvergence?:
    RunConvergedFlowDependencies["applyMetaReviewGateOnConvergence"];
  emitDeliveryNotificationAck?:
    RunConvergedFlowDependencies["emitDeliveryNotificationAck"];
  emitBubbleNotification?:
    RunConvergedFlowDependencies["emitBubbleNotification"];
  readTranscriptEnvelopes?: ReadTranscriptEnvelopesPort;
  resolveReviewerTestExecutionDirective?:
    ResolveReviewerTestExecutionDirectivePort | undefined;
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
    resolveReviewerTestExecutionDirective:
      input.resolveReviewerTestExecutionDirective,
    applyMetaReviewGateOnConvergence: input.applyMetaReviewGateOnConvergence,
    emitDeliveryNotificationAck: input.emitDeliveryNotificationAck,
    emitBubbleNotification: input.emitBubbleNotification,
    ...(input.readTranscriptEnvelopes !== undefined
      ? { readTranscriptEnvelopes: input.readTranscriptEnvelopes }
      : {})
  });
}

export interface BuildConvergedCommandFlowInvocationInput {
  summary: string;
  refs: string[];
  findings?: ConvergedStructuredFinding[] | undefined;
  now: Date;
  cwd?: string | undefined;
  authoritativeContext?: ActorEmitContextSnapshot | undefined;
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
      authoritativeContext: input.authoritativeContext,
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
