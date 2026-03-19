import {
  readTranscriptEnvelopes,
} from "../protocol/transcriptStore.js";
import { readStateSnapshot } from "../state/stateStore.js";
import { normalizeStringList, requireNonEmptyString } from "../util/normalize.js";
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
  type ReviewerTestExecutionDirective,
} from "../reviewer/testEvidence.js";
import {
  evaluateRepeatCleanAutoconvergeTrigger,
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
import { prepareReviewerPass } from "../../v11/application/pass/reviewerPassPreparation.js";
import { resolvePassIntent } from "../../v11/application/pass/passIntentResolution.js";
import { prepareReviewerVerification } from "../../v11/application/pass/reviewerVerificationPreparation.js";
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
  const now = input.now ?? new Date();
  const nowIso = now.toISOString();
  const summary = requireNonEmptyString(
    input.summary,
    "PASS summary",
    (message) => new PassCommandError(message)
  );
  const refs = normalizeStringList(input.refs ?? []);
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
  const reviewerPassPreparation = prepareReviewerPass({
    senderRole: handoff.senderRole,
    round: handoff.envelopeRound,
    noFindings,
    findings,
    hasFindings,
    findingsPayloadInvalid: normalizedFindings.invalid,
    reviewArtifactType: resolved.bubbleConfig.review_artifact_type,
    severityGateRound: resolved.bubbleConfig.severity_gate_round,
    summary,
    createError: (message) => new PassCommandError(message)
  });
  const inferredReviewerIntent = reviewerPassPreparation.inferredReviewerIntent;
  const reviewerFindingsClaim = reviewerPassPreparation.reviewerFindingsClaim;
  const reviewerFindingsClaimParserMetadata =
    reviewerPassPreparation.reviewerFindingsClaimParserMetadata;

  const intentResolution = resolvePassIntent(
    {
      senderRole: handoff.senderRole,
      noFindings,
      hasFindings,
      createError: (message) => new PassCommandError(message),
      ...(input.intent !== undefined
        ? { inputIntent: input.intent }
        : {}),
      ...(inferredReviewerIntent !== undefined
        ? { inferredReviewerIntent }
        : {})
    },
    {
      inferDefaultPassIntent: inferPassIntent
    }
  );
  const inferredIntent = intentResolution.inferredIntent;
  const intent = intentResolution.intent;

  const accuracyCritical = resolved.bubbleConfig.accuracy_critical === true;
  const reviewerVerification = await prepareReviewerVerification({
    reviewArtifactType: resolved.bubbleConfig.review_artifact_type,
    senderRole: handoff.senderRole,
    summary,
    refs,
    accuracyCritical,
    worktreePath: resolved.bubblePaths.worktreePath,
    intent,
    hasFindings,
    createError: (message) => new PassCommandError(message)
  }, {
    resolveReviewerVerification
  });

  const transcript = await readTranscriptEnvelopes(resolved.bubblePaths.transcriptPath, {
    allowMissing: true,
    toleratePartialFinalLine: true
  });
  const repeatCleanTrigger = evaluateRepeatCleanAutoconvergeTrigger({
    activeRole: handoff.senderRole,
    passIntent: intent,
    hasFindings,
    round: handoff.envelopeRound,
    reviewer,
    implementer,
    transcript
  });
  if (repeatCleanTrigger.trigger) {
    const autoConvergePreparation = await prepareRepeatCleanAutoConverge({
      round: handoff.envelopeRound,
      reviewer,
      implementer,
      reviewArtifactType: resolved.bubbleConfig.review_artifact_type,
      roundRoleHistory: state.round_role_history,
      transcript,
      severityGateRound: resolved.bubbleConfig.severity_gate_round,
      statePath: resolved.bubblePaths.statePath,
      expectedStateFingerprint: loadedState.fingerprint,
      reviewerVerification,
      reviewVerificationArtifactPath: resolved.bubblePaths.reviewVerificationArtifactPath,
      bubbleId: resolved.bubbleId,
      reviewerAgent: handoff.senderAgent,
      generatedAt: nowIso,
      createError: (message) => new PassCommandError(message)
    });

    const converged = await executeAutoConvergeConverged(
      {
        summary,
        refs,
        cwd: resolved.bubblePaths.worktreePath,
        now,
        expectedStateFingerprint: autoConvergePreparation.expectedStateFingerprint,
        expectedRound: handoff.envelopeRound,
        expectedReviewer: reviewer,
        onDownstreamRejected: (reason) =>
          raiseRepeatCleanDownstreamConvergedRejected({
            reason,
            createError: (message) => new PassCommandError(message)
          })
      },
      {
        emitConvergedFromWorkspace,
        ...(dependencies.emitTmuxDeliveryNotification !== undefined
          ? { emitTmuxDeliveryNotification: dependencies.emitTmuxDeliveryNotification }
          : {}),
        ...(dependencies.emitBubbleNotification !== undefined
          ? { emitBubbleNotification: dependencies.emitBubbleNotification }
          : {})
      }
    );

    return finalizeAutoConvergePass({
      now,
      bubbleConfig: resolved.bubbleConfig,
      artifactsDir: resolved.bubblePaths.artifactsDir,
      taskArtifactPath: resolved.bubblePaths.taskArtifactPath,
      round: handoff.envelopeRound,
      senderRole: handoff.senderRole,
      findings,
      createError: (message) => new PassCommandError(message),
      repoPath: resolved.repoPath,
      bubbleId: resolved.bubbleId,
      bubbleInstanceId: bubbleIdentity.bubbleInstanceId,
      passIntent: intent,
      inferredIntent,
      senderAgent: handoff.senderAgent,
      refsCount: refs.length,
      hasFindings,
      noFindings,
      ...(reviewerFindingsClaim !== undefined
        ? { reviewerFindingsClaim }
        : {}),
      ...(reviewerFindingsClaimParserMetadata !== undefined
        ? { reviewerFindingsClaimParserMetadata }
        : {}),
      repeatCleanReasonCode: repeatCleanTrigger.reasonCode,
      repeatCleanReasonDetail: repeatCleanTrigger.reasonDetail,
      repeatCleanTrigger: repeatCleanTrigger.trigger,
      mostRecentPreviousReviewerCleanPassEnvelope:
        repeatCleanTrigger.mostRecentPreviousReviewerCleanPassEnvelope,
      converged
    }, {
      updateReviewerDocGateArtifact,
      emitBubbleLifecycleEventBestEffort,
      buildPassLifecycleMetricMetadata,
      buildAutoConvergePassResult
    });
  }

  const normalPassAppendPreparation = prepareNormalPassAppend({
    senderRole: handoff.senderRole,
    reviewArtifactType: resolved.bubbleConfig.review_artifact_type,
    round: handoff.envelopeRound,
    findings,
    hasFindings,
    roundGateAppliesAfter:
      resolved.bubbleConfig.doc_contract_gates.round_gate_applies_after,
    locksDir: resolved.bubblePaths.locksDir,
    bubbleId: resolved.bubbleId
  });
  const docGateScopeActive = normalPassAppendPreparation.docGateScopeActive;
  const reviewerGateEvaluation = normalPassAppendPreparation.reviewerGateEvaluation;
  const findingsForPayload = normalPassAppendPreparation.findingsForPayload;
  const lockPath = normalPassAppendPreparation.lockPath;

  const mapped = await executeNormalPassAppend({
    transcriptPath: resolved.bubblePaths.transcriptPath,
    lockPath,
    now,
    bubbleId: resolved.bubbleId,
    handoff,
    summary,
    passIntent: intent,
    refs,
    hasFindings,
    findingsForPayload,
    ...(reviewerFindingsClaim !== undefined
      ? { reviewerFindingsClaim }
      : {}),
    ...(reviewerFindingsClaimParserMetadata !== undefined
      ? { reviewerFindingsClaimParserMetadata }
      : {}),
    repeatCleanReasonCode: repeatCleanTrigger.reasonCode,
    repeatCleanReasonDetail: repeatCleanTrigger.reasonDetail,
    repeatCleanTrigger: repeatCleanTrigger.trigger,
    mostRecentPreviousReviewerCleanPassEnvelope:
      repeatCleanTrigger.mostRecentPreviousReviewerCleanPassEnvelope
  });

  const postAppendPersistence = await persistNormalPassPostAppend(
    {
      reviewerVerification,
      bubbleId: resolved.bubbleId,
      handoff,
      generatedAt: nowIso,
      reviewVerificationArtifactPath: resolved.bubblePaths.reviewVerificationArtifactPath,
      mappedEnvelopeId: mapped.envelope.id,
      statePath: resolved.bubblePaths.statePath,
      state,
      expectedFingerprint: loadedState.fingerprint,
      appendEnvelopeId: mapped.envelope.id,
      docGateScopeActive,
      now,
      bubbleConfig: resolved.bubbleConfig,
      artifactsDir: resolved.bubblePaths.artifactsDir,
      taskArtifactPath: resolved.bubblePaths.taskArtifactPath,
      hasFindings,
      findings,
      ...(reviewerGateEvaluation !== undefined
        ? { reviewerGateEvaluation }
        : {}),
      createError: (message) => new PassCommandError(message)
    },
    {
      writePostAppendReviewVerificationArtifact,
      writePostAppendPassState,
      updateReviewerDocGateArtifact
    }
  );
  const written = postAppendPersistence.written;
  const docGateArtifactWriteFailureReason =
    postAppendPersistence.docGateArtifactWriteFailureReason;

  const normalPassDelivery = await executeNormalPassDelivery(
    {
      senderRole: handoff.senderRole,
      bubbleId: resolved.bubbleId,
      bubbleConfig: resolved.bubbleConfig,
      envelope: mapped.envelope,
      worktreePath: resolved.bubblePaths.worktreePath,
      repoPath: resolved.repoPath,
      artifactsDir: resolved.bubblePaths.artifactsDir,
      sessionsPath: resolved.bubblePaths.sessionsPath,
      reviewerBriefArtifactPath: resolved.bubblePaths.reviewerBriefArtifactPath,
      reviewerFocusArtifactPath: resolved.bubblePaths.reviewerFocusArtifactPath,
      recipientRole: handoff.recipientRole,
      now
    },
    {
      resolveReviewerTestDirectiveForPass,
      executePassDelivery,
      ...(dependencies.emitTmuxDeliveryNotification !== undefined
        ? { emitTmuxDeliveryNotification: dependencies.emitTmuxDeliveryNotification }
        : {}),
      ...(dependencies.refreshReviewerContext !== undefined
        ? { refreshReviewerContext: dependencies.refreshReviewerContext }
        : {})
    }
  );
  const reviewerTestDirective: ReviewerTestExecutionDirective | undefined =
    normalPassDelivery.reviewerTestDirective;
  const deliveryResult = normalPassDelivery.deliveryResult;
  const deliveryRetried = normalPassDelivery.deliveryRetried;

  return finalizeNormalPass({
    now,
    repoPath: resolved.repoPath,
    bubbleId: resolved.bubbleId,
    bubbleInstanceId: bubbleIdentity.bubbleInstanceId,
    round: handoff.envelopeRound,
    actorRole: handoff.senderRole,
    passIntent: intent,
    inferredIntent,
    sender: handoff.senderAgent,
    recipient: handoff.recipientAgent,
    recipientRole: handoff.recipientRole,
    refsCount: refs.length,
    hasFindings,
    noFindings,
    ...(reviewerFindingsClaim !== undefined
      ? { reviewerFindingsClaim }
      : {}),
    ...(reviewerFindingsClaimParserMetadata !== undefined
      ? { reviewerFindingsClaimParserMetadata }
      : {}),
    repeatCleanReasonCode: repeatCleanTrigger.reasonCode,
    repeatCleanReasonDetail: repeatCleanTrigger.reasonDetail,
    repeatCleanTrigger: repeatCleanTrigger.trigger,
    fallbackMostRecentPreviousReviewerCleanPassEnvelope:
      repeatCleanTrigger.mostRecentPreviousReviewerCleanPassEnvelope,
    ...(reviewerTestDirective !== undefined ? { reviewerTestDirective } : {}),
    findings: handoff.senderRole === "reviewer" ? findingsForPayload : findings,
    ...(docGateArtifactWriteFailureReason !== undefined
      ? { docGateArtifactWriteFailureReason }
      : {}),
    sequence: mapped.sequence,
    envelope: mapped.envelope,
    state: written.state,
    deliveryResult,
    deliveryRetried
  }, {
    emitBubbleLifecycleEventBestEffort,
    buildPassLifecycleMetricMetadata,
    resolveMostRecentPreviousReviewerPassIsCleanFromMetadata,
    mapPassResultDelivery,
    buildNormalPassResult
  });
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
