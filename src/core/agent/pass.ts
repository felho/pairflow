import {
  appendProtocolEnvelope,
  readTranscriptEnvelopes,
  type AppendProtocolEnvelopeResult
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
import { assertNoDocsOnlySkipLogRefConflict } from "../../v11/domain/pass/docsOnlyRuntimeSkipGuard.js";
import { validateReviewerVerificationConsistency } from "../../v11/domain/pass/reviewerVerificationConsistencyGuard.js";
import {
  raiseRepeatCleanDownstreamConvergedRejected,
} from "../../v11/domain/pass/repeatCleanPolicyRejection.js";
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
import { prepareReviewerPass } from "../../v11/application/pass/reviewerPassPreparation.js";
import { resolvePassIntent } from "../../v11/application/pass/passIntentResolution.js";
import {
  resolveMostRecentPreviousReviewerPassIsCleanFromMetadata as resolveMostRecentPreviousReviewerPassIsCleanFromMetadataV11
} from "../../v11/domain/pass/repeatCleanMetadata.js";
import { buildPassLifecycleMetricMetadata } from "../../v11/domain/pass/lifecycleMetricMetadata.js";
import { buildPassEnvelopeDraft } from "../../v11/domain/pass/passEnvelopeDraft.js";

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

function mapAppendResult(result: AppendProtocolEnvelopeResult): Pick<EmitPassResult, "sequence" | "envelope"> {
  return {
    sequence: result.sequence,
    envelope: result.envelope
  };
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

  assertNoDocsOnlySkipLogRefConflict({
    reviewArtifactType: resolved.bubbleConfig.review_artifact_type,
    senderRole: handoff.senderRole,
    summary,
    refs,
    createError: (message) => new PassCommandError(message)
  });

  const accuracyCritical = resolved.bubbleConfig.accuracy_critical === true;
  const reviewerVerification = await resolveReviewerVerification({
    accuracyCritical,
    senderRole: handoff.senderRole,
    refs,
    worktreePath: resolved.bubblePaths.worktreePath,
    createError: (message) => new PassCommandError(message)
  });
  if (reviewerVerification !== undefined) {
    validateReviewerVerificationConsistency({
      payloadOverall: reviewerVerification.payload.overall,
      intent,
      hasFindings,
      createError: (message) => new PassCommandError(message)
    });
  }

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

    let converged;
    try {
      converged = await emitConvergedFromWorkspace(
        {
          summary,
          refs,
          cwd: resolved.bubblePaths.worktreePath,
          now,
          expectedStateFingerprint: autoConvergePreparation.expectedStateFingerprint,
          expectedRound: handoff.envelopeRound,
          expectedReviewer: reviewer
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
      const reason = error instanceof Error ? error.message : String(error);
      raiseRepeatCleanDownstreamConvergedRejected({
        reason,
        createError: (message) => new PassCommandError(message)
      });
    }

    const autoConvergeFindings = findings;
    let autoConvergeDocGateArtifactWriteFailureReason: string | undefined;
    if (handoff.senderRole === "reviewer") {
      autoConvergeDocGateArtifactWriteFailureReason = await updateReviewerDocGateArtifact({
        now,
        bubbleConfig: resolved.bubbleConfig,
        artifactsDir: resolved.bubblePaths.artifactsDir,
        taskArtifactPath: resolved.bubblePaths.taskArtifactPath,
        round: handoff.envelopeRound,
        findings: autoConvergeFindings,
        createError: (message) => new PassCommandError(message)
      });
    }

    await emitBubbleLifecycleEventBestEffort({
      repoPath: resolved.repoPath,
      bubbleId: resolved.bubbleId,
      bubbleInstanceId: bubbleIdentity.bubbleInstanceId,
      eventType: "bubble_passed",
      round: handoff.envelopeRound,
      actorRole: handoff.senderRole,
      metadata: buildPassLifecycleMetricMetadata({
        passIntent: intent,
        inferredIntent,
        sender: handoff.senderAgent,
        recipient: "human",
        recipientRole: "human",
        refsCount: refs.length,
        hasFindings,
        noFindings,
        ...(reviewerFindingsClaim !== undefined
          ? { reviewerFindingsClaim }
          : {}),
        ...(reviewerFindingsClaimParserMetadata !== undefined
          ? { reviewerFindingsClaimParserMetadata }
          : {}),
        transitionDecision: "auto_converge",
        repeatCleanReasonCode: repeatCleanTrigger.reasonCode,
        repeatCleanReasonDetail: repeatCleanTrigger.reasonDetail,
        repeatCleanTrigger: repeatCleanTrigger.trigger,
        mostRecentPreviousReviewerCleanPassEnvelope:
          repeatCleanTrigger.mostRecentPreviousReviewerCleanPassEnvelope,
        findings: autoConvergeFindings,
        ...(autoConvergeDocGateArtifactWriteFailureReason !== undefined
          ? {
              docGateArtifactWriteFailureReason:
                autoConvergeDocGateArtifactWriteFailureReason
            }
          : {})
      }),
      now
    });

    return buildAutoConvergePassResult({
      bubbleId: resolved.bubbleId,
      inferredIntent,
      repeatCleanReasonDetail: repeatCleanTrigger.reasonDetail,
      convergenceSequence: converged.convergenceSequence,
      convergenceEnvelope: converged.convergenceEnvelope,
      state: converged.state,
      gateRoute: converged.gateRoute,
      approvalRequestSequence: converged.approvalRequestSequence,
      approvalRequestEnvelope: converged.approvalRequestEnvelope,
      ...(converged.delivery !== undefined
        ? { delivery: converged.delivery }
        : {}),
      ...(autoConvergeDocGateArtifactWriteFailureReason !== undefined
        ? {
            docGateArtifactWriteFailureReason:
              autoConvergeDocGateArtifactWriteFailureReason
          }
        : {})
    });
  }

  let docGateArtifactWriteFailureReason: string | undefined;
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

  const appendResult = await appendProtocolEnvelope({
    transcriptPath: resolved.bubblePaths.transcriptPath,
    lockPath,
    now,
    envelope: buildPassEnvelopeDraft({
      bubbleId: resolved.bubbleId,
      handoff,
      summary,
      passIntent: intent,
      refs,
      hasFindings,
      findingsForPayload,
      ...(reviewerFindingsClaim !== undefined ? { reviewerFindingsClaim } : {}),
      ...(reviewerFindingsClaimParserMetadata !== undefined
        ? { reviewerFindingsClaimParserMetadata }
        : {}),
      transitionDecision: "normal_pass",
      repeatCleanReasonCode: repeatCleanTrigger.reasonCode,
      repeatCleanReasonDetail: repeatCleanTrigger.reasonDetail,
      repeatCleanTrigger: repeatCleanTrigger.trigger,
      mostRecentPreviousReviewerCleanPassEnvelope:
        repeatCleanTrigger.mostRecentPreviousReviewerCleanPassEnvelope
    })
  });

  const mapped = mapAppendResult(appendResult);

  await writePostAppendReviewVerificationArtifact({
    reviewerVerification,
    bubbleId: resolved.bubbleId,
    round: handoff.nextRound,
    reviewer: handoff.senderAgent,
    generatedAt: nowIso,
    artifactPath: resolved.bubblePaths.reviewVerificationArtifactPath,
    envelopeId: mapped.envelope.id,
    createError: (message) => new PassCommandError(message)
  });

  const written = await writePostAppendPassState({
    statePath: resolved.bubblePaths.statePath,
    state,
    handoff,
    nowIso,
    expectedFingerprint: loadedState.fingerprint,
    envelopeId: appendResult.envelope.id,
    createError: (message) => new PassCommandError(message)
  });

  if (docGateScopeActive) {
    docGateArtifactWriteFailureReason = await updateReviewerDocGateArtifact({
      now,
      bubbleConfig: resolved.bubbleConfig,
      artifactsDir: resolved.bubblePaths.artifactsDir,
      taskArtifactPath: resolved.bubblePaths.taskArtifactPath,
      round: handoff.envelopeRound,
      findings: hasFindings ? findings : [],
      createError: (message) => new PassCommandError(message),
      ...(reviewerGateEvaluation !== undefined
        ? { reviewerEvaluation: reviewerGateEvaluation }
        : {})
    });
  }

  const reviewerTestDirective: ReviewerTestExecutionDirective | undefined =
    await resolveReviewerTestDirectiveForPass({
      senderRole: handoff.senderRole,
      bubbleId: resolved.bubbleId,
      bubbleConfig: resolved.bubbleConfig,
      envelope: mapped.envelope,
      worktreePath: resolved.bubblePaths.worktreePath,
      repoPath: resolved.repoPath,
      artifactsDir: resolved.bubblePaths.artifactsDir,
      now
    });

  const delivery = await executePassDelivery(
    {
      bubbleId: resolved.bubbleId,
      bubbleConfig: resolved.bubbleConfig,
      sessionsPath: resolved.bubblePaths.sessionsPath,
      reviewerBriefArtifactPath: resolved.bubblePaths.reviewerBriefArtifactPath,
      reviewerFocusArtifactPath: resolved.bubblePaths.reviewerFocusArtifactPath,
      envelope: mapped.envelope,
      senderRole: handoff.senderRole,
      recipientRole: handoff.recipientRole,
      ...(reviewerTestDirective !== undefined ? { reviewerTestDirective } : {})
    },
    {
      ...(dependencies.emitTmuxDeliveryNotification !== undefined
        ? { emitTmuxDeliveryNotification: dependencies.emitTmuxDeliveryNotification }
        : {}),
      ...(dependencies.refreshReviewerContext !== undefined
        ? { refreshReviewerContext: dependencies.refreshReviewerContext }
        : {})
    }
  );
  const deliveryResult = delivery.result;
  const deliveryRetried = delivery.retried;

  await emitBubbleLifecycleEventBestEffort({
    repoPath: resolved.repoPath,
    bubbleId: resolved.bubbleId,
    bubbleInstanceId: bubbleIdentity.bubbleInstanceId,
    eventType: "bubble_passed",
    round: handoff.envelopeRound,
    actorRole: handoff.senderRole,
    metadata: buildPassLifecycleMetricMetadata({
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
      transitionDecision: "normal_pass",
      repeatCleanReasonCode: repeatCleanTrigger.reasonCode,
      repeatCleanReasonDetail: repeatCleanTrigger.reasonDetail,
      repeatCleanTrigger: repeatCleanTrigger.trigger,
      mostRecentPreviousReviewerCleanPassEnvelope:
        repeatCleanTrigger.mostRecentPreviousReviewerCleanPassEnvelope,
      ...(reviewerTestDirective !== undefined ? { reviewerTestDirective } : {}),
      findings: handoff.senderRole === "reviewer" ? findingsForPayload : findings,
      ...(docGateArtifactWriteFailureReason !== undefined
        ? { docGateArtifactWriteFailureReason }
        : {})
    }),
    now
  });

  const mostRecentPreviousReviewerCleanPassEnvelope =
    resolveMostRecentPreviousReviewerPassIsCleanFromMetadata(
      mapped.envelope.payload.metadata
    ) ?? repeatCleanTrigger.mostRecentPreviousReviewerCleanPassEnvelope;
  const deliveryForResult = mapPassResultDelivery({
    deliveryResult,
    deliveryRetried
  });

  return buildNormalPassResult({
    bubbleId: resolved.bubbleId,
    sequence: mapped.sequence,
    envelope: mapped.envelope,
    state: written.state,
    inferredIntent,
    repeatCleanReasonCode: repeatCleanTrigger.reasonCode,
    repeatCleanReasonDetail: repeatCleanTrigger.reasonDetail,
    repeatCleanTrigger: repeatCleanTrigger.trigger,
    mostRecentPreviousReviewerCleanPassEnvelope,
    ...(deliveryForResult !== undefined
      ? { delivery: deliveryForResult }
      : {}),
    ...(docGateArtifactWriteFailureReason !== undefined
      ? { docGateArtifactWriteFailureReason }
      : {})
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
