import {
  type EmitConvergedDependencies,
  type EmitConvergedResult
} from "./converged.js";
import {
  type PassIntent,
  type ProtocolEnvelope
} from "../../types/protocol.js";
import type { Finding } from "../../types/findings.js";
import type {
  AgentRole,
  BubbleStateSnapshot
} from "../../types/bubble.js";
import {
  type RepeatCleanAutoconvergeReasonCode,
  type RepeatCleanAutoconvergeReasonDetail
} from "../convergence/repeatCleanAutoconverge.js";
import {
  type ResolvedPassHandoff
} from "../../v11/domain/pass/handoff.js";
import {
  raiseRepeatCleanDownstreamConvergedRejected,
} from "../../v11/domain/pass/repeatCleanPolicyRejection.js";
import { runAutoConvergeFlow } from "../../v11/application/pass/runAutoConvergeFlow.js";
import {
  type PassDeliveryDependencies
} from "../../v11/application/pass/reviewerDelivery.js";
import { preparePassRouting } from "../../v11/application/pass/passRoutingPreparation.js";
import { runNormalPassFlow } from "../../v11/application/pass/runNormalPassFlow.js";
import {
  buildAutoConvergeFlowInput
} from "../../v11/shared/pass/autoConvergeFlowInvocationBuilders.js";
import {
  buildNormalPassFlowInput
} from "../../v11/shared/pass/normalPassFlowInvocationBuilders.js";
import { normalizePassCommandError } from "../../v11/shared/pass/passCommandErrorNormalization.js";
import { normalizePassCommandInput } from "../../v11/shared/pass/passCommandInputNormalization.js";
import { normalizePassCommandPayload } from "../../v11/shared/pass/passCommandPayloadNormalization.js";
import {
  buildPassRoutingInput
} from "../../v11/shared/pass/passRoutingInvocationBuilders.js";
import { preparePassWorkspaceContext } from "../../v11/shared/pass/passWorkspaceContextPreparation.js";
import {
  resolveMostRecentPreviousReviewerPassIsCleanFromMetadata as resolveMostRecentPreviousReviewerPassIsCleanFromMetadataV11
} from "../../v11/domain/pass/repeatCleanMetadata.js";
import {
  createAutoConvergeFlowDependencies,
  createNormalPassFlowDependencies,
  createPassRoutingDependencies
} from "../../v11/shared/pass/passFlowDependencyWiring.js";

export interface EmitPassInput {
  summary: string;
  refs?: string[];
  intent?: PassIntent;
  findings?: Finding[];
  noFindings?: boolean;
  cwd?: string;
  now?: Date;
}

export interface EmitPassResult {
  bubbleId: string;
  sequence: number;
  envelope: ProtocolEnvelope;
  resultEnvelopeKind: "pass" | "convergence";
  state: BubbleStateSnapshot;
  inferredIntent: boolean;
  transitionDecision: "normal_pass" | "auto_converge";
  repeatCleanReasonCode: RepeatCleanAutoconvergeReasonCode;
  repeatCleanReasonDetail: RepeatCleanAutoconvergeReasonDetail;
  repeatCleanTrigger: boolean;
  mostRecentPreviousReviewerCleanPassEnvelope: boolean;
  autoConverged?: {
    gateRoute: EmitConvergedResult["gateRoute"];
    convergenceSequence: number;
    convergenceEnvelope: ProtocolEnvelope;
    approvalRequestSequence: number;
    approvalRequestEnvelope: ProtocolEnvelope;
  };
  delivery?: {
    delivered: boolean;
    reason?: string;
    retried: boolean;
  };
  docGateArtifactWriteFailureReason?: string;
}

export interface EmitPassDependencies extends PassDeliveryDependencies {
  emitBubbleNotification?: EmitConvergedDependencies["emitBubbleNotification"];
}

export class PassCommandError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "PassCommandError";
  }
}

// Canonical reader for repeat-clean most-recent previous reviewer PASS cleanliness.
// Deprecated key is retained for backward compatibility with existing append-only transcripts.
export function resolveMostRecentPreviousReviewerPassIsCleanFromMetadata(
  metadata: Record<string, unknown> | undefined
): boolean | undefined {
  return resolveMostRecentPreviousReviewerPassIsCleanFromMetadataV11(
    metadata
  );
}

export function inferPassIntent(activeRole: AgentRole): PassIntent {
  if (activeRole === "implementer") {
    return "review";
  }
  if (activeRole === "reviewer") {
    return "fix_request";
  }

  throw new PassCommandError(
    `Unsupported active role for pass intent inference: ${activeRole}.`
  );
}

export async function emitPassFromWorkspace(
  input: EmitPassInput,
  dependencies: EmitPassDependencies = {}
): Promise<EmitPassResult> {
  const normalizedCommandInput = normalizePassCommandInput({
    summary: input.summary,
    refs: input.refs,
    now: input.now,
    createError: (message) => new PassCommandError(message)
  });
  const now = normalizedCommandInput.now;
  const nowIso = now.toISOString();
  const summary = normalizedCommandInput.summary;
  const refs = normalizedCommandInput.refs;
  const normalizedPayload = normalizePassCommandPayload({
    findings: input.findings,
    noFindings: input.noFindings
  });
  const findings = normalizedPayload.findings;
  const hasFindings = normalizedPayload.hasFindings;
  const noFindings = normalizedPayload.noFindings;
  const workspaceContext = await preparePassWorkspaceContext({
    cwd: input.cwd,
    now,
    nowIso,
    createError: (message) => new PassCommandError(message)
  });
  const resolved = workspaceContext.resolved;
  const bubbleIdentity = workspaceContext.bubbleIdentity;
  const loadedState = workspaceContext.loadedState;
  const state = workspaceContext.state;
  const handoff: ResolvedPassHandoff = workspaceContext.handoff;
  const implementer = workspaceContext.implementer;
  const reviewer = workspaceContext.reviewer;
  const passRouting = await preparePassRouting(
    buildPassRoutingInput({
      senderRole: handoff.senderRole,
      round: handoff.envelopeRound,
      summary,
      refs,
      findings,
      hasFindings,
      noFindings,
      findingsPayloadInvalid: normalizedPayload.findingsPayloadInvalid,
      bubbleConfig: resolved.bubbleConfig,
      worktreePath: resolved.bubblePaths.worktreePath,
      transcriptPath: resolved.bubblePaths.transcriptPath,
      reviewer,
      implementer,
      createError: (message) => new PassCommandError(message),
      ...(input.intent !== undefined
        ? { inputIntent: input.intent }
        : {})
    }),
    createPassRoutingDependencies(inferPassIntent)
  );

  const repeatCleanTrigger = passRouting.repeatCleanTrigger;
  if (repeatCleanTrigger.trigger) {
    return runAutoConvergeFlow(
      buildAutoConvergeFlowInput({
        summary,
        refs,
        now,
        nowIso,
        findings,
        hasFindings,
        noFindings,
        resolved,
        bubbleIdentity,
        handoff,
        reviewer,
        implementer,
        state,
        loadedState,
        passRouting,
        createError: (message) => new PassCommandError(message),
        onDownstreamRejected: (reason) =>
          raiseRepeatCleanDownstreamConvergedRejected({
            reason,
            createError: (message) => new PassCommandError(message)
          })
      }),
      createAutoConvergeFlowDependencies(dependencies)
    );
  }

  return runNormalPassFlow(
    buildNormalPassFlowInput({
      now,
      nowIso,
      summary,
      refs,
      hasFindings,
      noFindings,
      findings,
      resolved,
      bubbleIdentity,
      handoff,
      reviewer,
      implementer,
      state,
      loadedState,
      passRouting,
      createError: (message) => new PassCommandError(message)
    }),
    createNormalPassFlowDependencies(dependencies)
  );
}

export function asPassCommandError(error: unknown): never {
  throw normalizePassCommandError({
    error,
    isPassCommandError: (candidate) => candidate instanceof PassCommandError,
    createPassCommandError: (message) => new PassCommandError(message)
  });
}
