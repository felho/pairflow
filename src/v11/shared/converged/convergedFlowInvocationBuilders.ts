import type { AgentName } from "../../../types/bubble.js";
import type { ActorEmitContextSnapshot } from "../actorProtocol/actorEmitContext.js";
import type { ConvergedStructuredFinding } from "./convergedCommandTypes.js";
import { executeConvergedExecution } from "../../application/converged/convergedExecution.js";
import type {
  FinalizeConvergedFlowDependencies
} from "../../application/converged/convergedFinalizationTypes.js";
import { finalizeConvergedFlow } from "../../application/converged/convergedFinalization.js";
import { prepareConvergedPolicy } from "../../application/converged/convergedPolicyPreparation.js";
import { prepareConvergedRouting } from "../../application/converged/convergedRoutingPreparation.js";
import { prepareConvergedValidation } from "../../application/converged/convergedValidationPreparation.js";
import {
  applyMetaReviewGateOnConvergence,
  recoverMetaReviewGateFromSnapshot
} from "../metaReviewGate/metaReviewGateCommandApi.js";
import { appendProtocolEnvelope } from "../../infrastructure/artifact/transcript/transcriptStore.js";
import { readTranscriptEnvelopes } from "../../infrastructure/artifact/transcript/transcriptStore.js";
import { assessPairflowCommandPath } from "../../infrastructure/executor/command/pairflowCommand.js";
import { emitBubbleNotification } from "../../infrastructure/channel/notifications.js";
import {
  emitTmuxDeliveryNotification,
  resolveDeliveryMessageRef
} from "../../infrastructure/channel/tmux/tmuxDelivery.js";
import { emitBubbleLifecycleEventBestEffort } from "../../../v11/shared/metrics/bubbleEvents.js";
import type { EmitBubbleNotificationPort } from "../ports/notifications.js";
import type { AppendProtocolEnvelopePort } from "../ports/transcript.js";
import type { ReadTranscriptEnvelopesPort } from "../ports/transcript.js";
import type {
  EmitTmuxDeliveryNotificationPort,
  ResolveDeliveryMessageRefPort
} from "../ports/tmuxDelivery.js";
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
  applyMetaReviewGateOnConvergence?:
    RunConvergedFlowDependencies["applyMetaReviewGateOnConvergence"];
  recoverMetaReviewGateFromSnapshot?:
    RunConvergedFlowDependencies["recoverMetaReviewGateFromSnapshot"];
  emitTmuxDeliveryNotification?:
    RunConvergedFlowDependencies["emitTmuxDeliveryNotification"];
  emitBubbleNotification?:
    RunConvergedFlowDependencies["emitBubbleNotification"];
  readTranscriptEnvelopes?: ReadTranscriptEnvelopesPort;
}

export function buildConvergedFlowDependencies(
  input: BuildConvergedFlowDependenciesInput
): RunConvergedFlowDependencies {
  return {
    prepareConvergedRouting: input.prepareConvergedRouting,
    prepareConvergedPolicy: (policyInput) =>
      input.prepareConvergedPolicy(policyInput, {
        ...(input.readTranscriptEnvelopes !== undefined
          ? { readTranscriptEnvelopes: input.readTranscriptEnvelopes }
          : { readTranscriptEnvelopes })
      }),
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
  readTranscriptEnvelopes?: ReadTranscriptEnvelopesPort;
}

export interface ResolvedConvergedExecutionDependencies {
  appendProtocolEnvelope: AppendProtocolEnvelopePort;
  applyMetaReviewGateOnConvergence:
    NonNullable<RunConvergedFlowDependencies["applyMetaReviewGateOnConvergence"]>;
  recoverMetaReviewGateFromSnapshot:
    NonNullable<RunConvergedFlowDependencies["recoverMetaReviewGateFromSnapshot"]>;
  emitTmuxDeliveryNotification: EmitTmuxDeliveryNotificationPort;
  emitBubbleNotification: EmitBubbleNotificationPort;
  resolveDeliveryMessageRef: ResolveDeliveryMessageRefPort;
}

export interface BuildDefaultConvergedExecutionDependenciesInput {
  appendProtocolEnvelope?: AppendProtocolEnvelopePort | undefined;
  applyMetaReviewGateOnConvergence?:
    RunConvergedFlowDependencies["applyMetaReviewGateOnConvergence"];
  recoverMetaReviewGateFromSnapshot?:
    RunConvergedFlowDependencies["recoverMetaReviewGateFromSnapshot"];
  emitTmuxDeliveryNotification?:
    RunConvergedFlowDependencies["emitTmuxDeliveryNotification"];
  emitBubbleNotification?:
    RunConvergedFlowDependencies["emitBubbleNotification"];
  resolveDeliveryMessageRef?: ResolveDeliveryMessageRefPort | undefined;
}

export function buildDefaultConvergedExecutionDependencies(
  input: BuildDefaultConvergedExecutionDependenciesInput = {}
): ResolvedConvergedExecutionDependencies {
  return {
    appendProtocolEnvelope:
      input.appendProtocolEnvelope ?? appendProtocolEnvelope,
    applyMetaReviewGateOnConvergence:
      input.applyMetaReviewGateOnConvergence ??
      applyMetaReviewGateOnConvergence,
    recoverMetaReviewGateFromSnapshot:
      input.recoverMetaReviewGateFromSnapshot ??
      recoverMetaReviewGateFromSnapshot,
    emitTmuxDeliveryNotification:
      input.emitTmuxDeliveryNotification ?? emitTmuxDeliveryNotification,
    emitBubbleNotification:
      input.emitBubbleNotification ?? emitBubbleNotification,
    resolveDeliveryMessageRef:
      input.resolveDeliveryMessageRef ?? resolveDeliveryMessageRef
  };
}

export interface ResolvedConvergedGateDeliveryDependencies {
  emitTmuxDeliveryNotification: EmitTmuxDeliveryNotificationPort;
  resolveDeliveryMessageRef: ResolveDeliveryMessageRefPort;
}

export interface BuildDefaultConvergedGateDeliveryDependenciesInput {
  emitTmuxDeliveryNotification?: EmitTmuxDeliveryNotificationPort | undefined;
  resolveDeliveryMessageRef?: ResolveDeliveryMessageRefPort | undefined;
}

export function buildDefaultConvergedGateDeliveryDependencies(
  input: BuildDefaultConvergedGateDeliveryDependenciesInput = {}
): ResolvedConvergedGateDeliveryDependencies {
  return {
    emitTmuxDeliveryNotification:
      input.emitTmuxDeliveryNotification ?? emitTmuxDeliveryNotification,
    resolveDeliveryMessageRef:
      input.resolveDeliveryMessageRef ?? resolveDeliveryMessageRef
  };
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
    emitBubbleNotification: input.emitBubbleNotification,
    ...(input.readTranscriptEnvelopes !== undefined
      ? { readTranscriptEnvelopes: input.readTranscriptEnvelopes }
      : {})
  });
}

export interface BuildDefaultConvergedFinalizationDependenciesInput {
  resolveMetaReviewRolloutBlockingReasonCodes:
    FinalizeConvergedFlowDependencies["resolveMetaReviewRolloutBlockingReasonCodes"];
  activeEntrypoint?: string | undefined;
  assessPairflowCommandPath?:
    FinalizeConvergedFlowDependencies["assessPairflowCommandPath"];
  emitBubbleLifecycleEventBestEffort?:
    FinalizeConvergedFlowDependencies["emitBubbleLifecycleEventBestEffort"];
}

export function buildDefaultConvergedFinalizationDependencies(
  input: BuildDefaultConvergedFinalizationDependenciesInput
): FinalizeConvergedFlowDependencies {
  return {
    resolveMetaReviewRolloutBlockingReasonCodes:
      input.resolveMetaReviewRolloutBlockingReasonCodes,
    ...(input.activeEntrypoint !== undefined
      ? { activeEntrypoint: input.activeEntrypoint }
      : {}),
    assessPairflowCommandPath:
      input.assessPairflowCommandPath ?? assessPairflowCommandPath,
    emitBubbleLifecycleEventBestEffort:
      input.emitBubbleLifecycleEventBestEffort ??
      emitBubbleLifecycleEventBestEffort
  };
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
