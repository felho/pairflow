import { readStateSnapshot } from "../state/stateStore.js";
import {
  resolveBubbleFromWorkspaceCwd,
  WorkspaceResolutionError
} from "../bubble/workspaceResolution.js";
import {
  IDEATION_PASS_BLOCKED,
  resolveIdeationMetadata
} from "../bubble/ideation.js";
import {
  type EmitConvergedDependencies,
  emitConvergedFromWorkspace,
  type EmitConvergedResult
} from "./converged.js";
import { ensureBubbleInstanceIdForMutation } from "../bubble/bubbleInstanceId.js";
import { emitBubbleLifecycleEventBestEffort } from "../metrics/bubbleEvents.js";
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
  resolvePassHandoff,
  type ResolvedPassHandoff
} from "../../v11/domain/pass/handoff.js";
import { normalizeReviewerFindingsPayload } from "../../v11/domain/pass/reviewerFindingsPayload.js";
import {
  raiseRepeatCleanDownstreamConvergedRejected,
} from "../../v11/domain/pass/repeatCleanPolicyRejection.js";
import { executeAutoConvergeConverged } from "../../v11/application/pass/autoConvergeConvergedExecution.js";
import { finalizeAutoConvergePass } from "../../v11/application/pass/autoConvergeFinalization.js";
import { runAutoConvergeFlow } from "../../v11/application/pass/runAutoConvergeFlow.js";
import { resolveReviewerVerification } from "../../v11/application/pass/reviewerVerificationResolver.js";
import {
  executePassDelivery,
  type PassDeliveryDependencies
} from "../../v11/application/pass/reviewerDelivery.js";
import { prepareRepeatCleanAutoConverge } from "../../v11/application/pass/autoConvergePreparation.js";
import { mapPassResultDelivery } from "../../v11/application/pass/passResultDelivery.js";
import {
  buildAutoConvergePassResult,
  buildNormalPassResult
} from "../../v11/application/pass/passResultBuilder.js";
import { writePostAppendReviewVerificationArtifact } from "../../v11/application/pass/postAppendReviewVerificationWriter.js";
import { writePostAppendPassState } from "../../v11/application/pass/postAppendStateWriter.js";
import { resolveReviewerTestDirectiveForPass } from "../../v11/application/pass/reviewerTestDirectiveResolver.js";
import { updateReviewerDocGateArtifact } from "../../v11/application/pass/reviewerDocGateArtifactUpdater.js";
import { prepareNormalPassAppend } from "../../v11/application/pass/normalPassAppendPreparation.js";
import { executeNormalPassAppend } from "../../v11/application/pass/normalPassAppendExecution.js";
import { executeNormalPassDelivery } from "../../v11/application/pass/normalPassDeliveryExecution.js";
import { persistNormalPassPostAppend } from "../../v11/application/pass/normalPassPostAppendPersistence.js";
import { finalizeNormalPass } from "../../v11/application/pass/normalPassFinalization.js";
import { preparePassRouting } from "../../v11/application/pass/passRoutingPreparation.js";
import { prepareReviewerPass } from "../../v11/application/pass/reviewerPassPreparation.js";
import { resolvePassIntent } from "../../v11/application/pass/passIntentResolution.js";
import { prepareReviewerVerification } from "../../v11/application/pass/reviewerVerificationPreparation.js";
import { runNormalPassFlow } from "../../v11/application/pass/runNormalPassFlow.js";
import {
  buildAutoConvergeFlowDependencies,
  buildAutoConvergeFlowInput
} from "../../v11/shared/pass/autoConvergeFlowInvocationBuilders.js";
import {
  buildNormalPassFlowDependencies,
  buildNormalPassFlowInput
} from "../../v11/shared/pass/normalPassFlowInvocationBuilders.js";
import { normalizePassCommandInput } from "../../v11/shared/pass/passCommandInputNormalization.js";
import {
  resolveMostRecentPreviousReviewerPassIsCleanFromMetadata as resolveMostRecentPreviousReviewerPassIsCleanFromMetadataV11
} from "../../v11/domain/pass/repeatCleanMetadata.js";
import { buildPassLifecycleMetricMetadata } from "../../v11/domain/pass/lifecycleMetricMetadata.js";

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
  const normalizedFindings = normalizeReviewerFindingsPayload(input.findings);
  const findings = normalizedFindings.findings;
  const hasFindings = findings.length > 0;
  const noFindings = input.noFindings ?? false;

  const resolved = await resolveBubbleFromWorkspaceCwd(input.cwd);
  const bubbleIdentity = await ensureBubbleInstanceIdForMutation({
    bubbleId: resolved.bubbleId,
    repoPath: resolved.repoPath,
    bubblePaths: resolved.bubblePaths,
    bubbleConfig: resolved.bubbleConfig,
    now
  });
  resolved.bubbleConfig = bubbleIdentity.bubbleConfig;

  const loadedState = await readStateSnapshot(resolved.bubblePaths.statePath);
  const state = loadedState.state;
  const ideationMetadata = resolveIdeationMetadata(resolved.bubbleConfig);
  if (
    state.state === "RUNNING" &&
    state.round === 0 &&
    ideationMetadata.mode &&
    ideationMetadata.taskPending
  ) {
    throw new PassCommandError(
      `${IDEATION_PASS_BLOCKED}: ideation kickoff is required before PASS handoff.`
    );
  }

  const { implementer, reviewer } = resolved.bubbleConfig.agents;
  const handoff: ResolvedPassHandoff = resolvePassHandoff({
    state,
    implementer,
    reviewer,
    nowIso,
    createError: (message) => new PassCommandError(message)
  });
  const passRouting = await preparePassRouting(
    {
      senderRole: handoff.senderRole,
      round: handoff.envelopeRound,
      summary,
      refs,
      findings,
      hasFindings,
      noFindings,
      findingsPayloadInvalid: normalizedFindings.invalid,
      bubbleConfig: {
        review_artifact_type: resolved.bubbleConfig.review_artifact_type,
        severity_gate_round: resolved.bubbleConfig.severity_gate_round,
        ...(resolved.bubbleConfig.accuracy_critical !== undefined
          ? { accuracy_critical: resolved.bubbleConfig.accuracy_critical }
          : {})
      },
      worktreePath: resolved.bubblePaths.worktreePath,
      transcriptPath: resolved.bubblePaths.transcriptPath,
      reviewer,
      implementer,
      createError: (message) => new PassCommandError(message),
      ...(input.intent !== undefined
        ? { inputIntent: input.intent }
        : {})
    },
    {
      prepareReviewerPass,
      resolvePassIntent,
      prepareReviewerVerification,
      resolveReviewerVerification,
      inferDefaultPassIntent: inferPassIntent
    }
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
      buildAutoConvergeFlowDependencies({
        prepareRepeatCleanAutoConverge,
        executeAutoConvergeConverged,
        emitConvergedFromWorkspace,
        ...(dependencies.emitTmuxDeliveryNotification !== undefined
          ? { emitTmuxDeliveryNotification: dependencies.emitTmuxDeliveryNotification }
          : {}),
        ...(dependencies.emitBubbleNotification !== undefined
          ? { emitBubbleNotification: dependencies.emitBubbleNotification }
          : {}),
        finalizeAutoConvergePass,
        updateReviewerDocGateArtifact,
        emitBubbleLifecycleEventBestEffort,
        buildPassLifecycleMetricMetadata,
        buildAutoConvergePassResult
      })
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
    buildNormalPassFlowDependencies({
      prepareNormalPassAppend,
      executeNormalPassAppend,
      persistNormalPassPostAppend,
      writePostAppendReviewVerificationArtifact,
      writePostAppendPassState,
      updateReviewerDocGateArtifact,
      executeNormalPassDelivery,
      resolveReviewerTestDirectiveForPass,
      executePassDelivery,
      ...(dependencies.emitTmuxDeliveryNotification !== undefined
        ? { emitTmuxDeliveryNotification: dependencies.emitTmuxDeliveryNotification }
        : {}),
      ...(dependencies.refreshReviewerContext !== undefined
        ? { refreshReviewerContext: dependencies.refreshReviewerContext }
        : {}),
      finalizeNormalPass,
      emitBubbleLifecycleEventBestEffort,
      buildPassLifecycleMetricMetadata,
      resolveMostRecentPreviousReviewerPassIsCleanFromMetadata,
      mapPassResultDelivery,
      buildNormalPassResult
    })
  );
}

export function asPassCommandError(error: unknown): never {
  if (error instanceof PassCommandError) {
    throw error;
  }

  if (error instanceof WorkspaceResolutionError) {
    throw new PassCommandError(error.message);
  }

  if (error instanceof Error) {
    throw new PassCommandError(error.message);
  }

  throw error;
}
