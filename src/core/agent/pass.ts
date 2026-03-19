import { join } from "node:path";

import {
  appendProtocolEnvelope,
  readTranscriptEnvelopes,
  type AppendProtocolEnvelopeResult
} from "../protocol/transcriptStore.js";
import { readStateSnapshot, writeStateSnapshot } from "../state/stateStore.js";
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
  isPassIntent,
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
  createReviewVerificationArtifact,
  writeReviewVerificationArtifactAtomic
} from "../reviewer/reviewVerification.js";
import {
  evaluateReviewerGateWarnings,
  isDocContractGateScopeActive,
} from "../gates/docContractGates.js";
import {
  validateConvergencePolicy
} from "../convergence/policy.js";
import {
  evaluateRepeatCleanAutoconvergeTrigger,
  repeatCleanAutoconvergeTriggeredReasonCode,
  type RepeatCleanAutoconvergeReasonCode,
  type RepeatCleanAutoconvergeReasonDetail
} from "../convergence/repeatCleanAutoconverge.js";
import {
  resolvePassHandoff,
  type ResolvedPassHandoff
} from "../../v11/domain/pass/handoff.js";
import {
  assertReviewerNoFindingsSummaryConsistency,
  inferReviewerPassIntent,
  validateReviewerPassGate
} from "../../v11/domain/pass/reviewerDecision.js";
import {
  resolveReviewerFindingsClaim,
  resolveReviewerFindingsClaimParserMetadata
} from "../../v11/domain/pass/reviewerFindingsClaim.js";
import { normalizeReviewerFindingsPayload } from "../../v11/domain/pass/reviewerFindingsPayload.js";
import { assertNoDocsOnlySkipLogRefConflict } from "../../v11/domain/pass/docsOnlyRuntimeSkipGuard.js";
import { assertReviewerIntentOverrideConsistency } from "../../v11/domain/pass/reviewerIntentOverrideGuard.js";
import { validateReviewerVerificationConsistency } from "../../v11/domain/pass/reviewerVerificationConsistencyGuard.js";
import {
  raiseRepeatCleanAutoConvergeStateStale,
  raiseRepeatCleanDownstreamConvergedRejected,
  raiseRepeatCleanPolicyGateRejected,
  raiseRepeatCleanReviewVerificationWriteFailed
} from "../../v11/domain/pass/repeatCleanPolicyRejection.js";
import { resolveReviewerVerification } from "../../v11/application/pass/reviewerVerificationResolver.js";
import {
  executePassDelivery,
  type PassDeliveryDependencies
} from "../../v11/application/pass/reviewerDelivery.js";
import { resolveReviewerTestDirectiveForPass } from "../../v11/application/pass/reviewerTestDirectiveResolver.js";
import { updateReviewerDocGateArtifact } from "../../v11/application/pass/reviewerDocGateArtifactUpdater.js";
import { raisePostAppendReviewVerificationWriteFailed } from "../../v11/domain/pass/postAppendReviewVerificationWriteFailure.js";
import { raisePostAppendStateWriteFailed } from "../../v11/domain/pass/postAppendStateWriteFailure.js";
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
  if (handoff.senderRole === "reviewer") {
    validateReviewerPassGate({
      round: handoff.envelopeRound,
      noFindings,
      findings,
      findingsPayloadInvalid: normalizedFindings.invalid,
      reviewArtifactType: resolved.bubbleConfig.review_artifact_type,
      severityGateRound: resolved.bubbleConfig.severity_gate_round,
      createError: (message) => new PassCommandError(message)
    });
    assertReviewerNoFindingsSummaryConsistency({
      summary,
      noFindings,
      createError: (message) => new PassCommandError(message)
    });
  }
  const inferredReviewerIntent =
    handoff.senderRole === "reviewer"
      ? inferReviewerPassIntent({
        hasFindings,
        noFindings,
        createError: (message) => new PassCommandError(message)
      })
      : undefined;
  const reviewerFindingsClaim =
    handoff.senderRole === "reviewer"
      ? resolveReviewerFindingsClaim({
        noFindings,
        findings,
        createError: (message) => new PassCommandError(message)
      })
      : undefined;
  const reviewerFindingsClaimParserMetadata =
    handoff.senderRole === "reviewer" && reviewerFindingsClaim !== undefined
      ? resolveReviewerFindingsClaimParserMetadata({
        summary,
        claimState: reviewerFindingsClaim.state
      })
      : undefined;

  if (handoff.senderRole !== "reviewer" && (hasFindings || noFindings)) {
    throw new PassCommandError(
      "Implementer PASS does not accept findings flags; findings are reviewer-only."
    );
  }

  const inferredIntent = input.intent === undefined;
  const intent = input.intent
    ?? (handoff.senderRole === "reviewer"
      ? inferredReviewerIntent
      : inferPassIntent(handoff.senderRole));
  if (!isPassIntent(intent)) {
    throw new PassCommandError(`Invalid pass intent: ${String(intent)}`);
  }
  if (handoff.senderRole === "reviewer") {
    assertReviewerIntentOverrideConsistency({
      intent,
      noFindings,
      hasFindings,
      createError: (message) => new PassCommandError(message)
    });
  }

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
    const policyResult = validateConvergencePolicy({
      currentRound: handoff.envelopeRound,
      reviewer,
      implementer,
      reviewArtifactType: resolved.bubbleConfig.review_artifact_type,
      roundRoleHistory: state.round_role_history,
      transcript,
      severity_gate_round: resolved.bubbleConfig.severity_gate_round
    });
    if (!policyResult.ok) {
      raiseRepeatCleanPolicyGateRejected({
        errors: policyResult.errors,
        diagnostics: policyResult.diagnostics,
        createError: (message) => new PassCommandError(message)
      });
    }

    const stateBeforeAutoConvergeSideEffects = await readStateSnapshot(
      resolved.bubblePaths.statePath
    );
    if (stateBeforeAutoConvergeSideEffects.fingerprint !== loadedState.fingerprint) {
      raiseRepeatCleanAutoConvergeStateStale({
        createError: (message) => new PassCommandError(message)
      });
    }

    if (reviewerVerification !== undefined) {
      const verificationArtifact = createReviewVerificationArtifact({
        payload: reviewerVerification.payload,
        inputRef: reviewerVerification.inputRef,
        bubbleId: resolved.bubbleId,
        round: handoff.envelopeRound,
        reviewer: handoff.senderAgent,
        generatedAt: nowIso
      });
      try {
        await writeReviewVerificationArtifactAtomic(
          resolved.bubblePaths.reviewVerificationArtifactPath,
          verificationArtifact
        );
      } catch (error) {
        const reason = error instanceof Error ? error.message : String(error);
        raiseRepeatCleanReviewVerificationWriteFailed({
          reason,
          createError: (message) => new PassCommandError(message)
        });
      }
    }

    let converged;
    try {
      converged = await emitConvergedFromWorkspace(
        {
          summary,
          refs,
          cwd: resolved.bubblePaths.worktreePath,
          now,
          expectedStateFingerprint: stateBeforeAutoConvergeSideEffects.fingerprint,
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

    return {
      bubbleId: resolved.bubbleId,
      sequence: converged.convergenceSequence,
      envelope: converged.convergenceEnvelope,
      resultEnvelopeKind: "convergence",
      state: converged.state,
      inferredIntent,
      transitionDecision: "auto_converge",
      repeatCleanReasonCode: repeatCleanAutoconvergeTriggeredReasonCode,
      repeatCleanReasonDetail: repeatCleanTrigger.reasonDetail,
      repeatCleanTrigger: true,
      mostRecentPreviousReviewerCleanPassEnvelope: true,
      autoConverged: {
        gateRoute: converged.gateRoute,
        convergenceSequence: converged.convergenceSequence,
        convergenceEnvelope: converged.convergenceEnvelope,
        approvalRequestSequence: converged.approvalRequestSequence,
        approvalRequestEnvelope: converged.approvalRequestEnvelope
      },
      ...(converged.delivery !== undefined
        ? {
            delivery: converged.delivery
          }
        : {}),
      ...(autoConvergeDocGateArtifactWriteFailureReason !== undefined
        ? {
            docGateArtifactWriteFailureReason:
              autoConvergeDocGateArtifactWriteFailureReason
          }
        : {})
    };
  }

  let reviewerGateEvaluation:
    | ReturnType<typeof evaluateReviewerGateWarnings>
    | undefined;
  let docGateArtifactWriteFailureReason: string | undefined;
  const docGateScopeActive =
    handoff.senderRole === "reviewer"
    && isDocContractGateScopeActive({
      reviewArtifactType: resolved.bubbleConfig.review_artifact_type
    });
  const findingsForPayload: Finding[] =
    docGateScopeActive && hasFindings
      ? (() => {
        reviewerGateEvaluation = evaluateReviewerGateWarnings({
          round: handoff.envelopeRound,
          findings,
          roundGateAppliesAfter:
            resolved.bubbleConfig.doc_contract_gates.round_gate_applies_after
        });
        return reviewerGateEvaluation.normalizedFindings;
      })()
      : findings;

  const lockPath = join(resolved.bubblePaths.locksDir, `${resolved.bubbleId}.lock`);

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

  if (reviewerVerification !== undefined) {
    const verificationArtifact = createReviewVerificationArtifact({
      payload: reviewerVerification.payload,
      inputRef: reviewerVerification.inputRef,
      bubbleId: resolved.bubbleId,
      round: handoff.nextRound,
      reviewer: handoff.senderAgent,
      generatedAt: nowIso
    });
    try {
      await writeReviewVerificationArtifactAtomic(
        resolved.bubblePaths.reviewVerificationArtifactPath,
        verificationArtifact
      );
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      raisePostAppendReviewVerificationWriteFailed({
        envelopeId: mapped.envelope.id,
        reason,
        createError: (message) => new PassCommandError(message)
      });
    }
  }

  const nextState: BubbleStateSnapshot = {
    ...state,
    round: handoff.nextRound,
    active_agent: handoff.recipientAgent,
    active_role: handoff.recipientRole,
    active_since: nowIso,
    last_command_at: nowIso,
    round_role_history:
      handoff.appendRoundRoleEntry === undefined
        ? state.round_role_history
        : [...state.round_role_history, handoff.appendRoundRoleEntry]
  };

  let written;
  try {
    // Transcript is canonical source of truth. If state write fails after append,
    // recovery must reconcile from latest transcript entry.
    written = await writeStateSnapshot(resolved.bubblePaths.statePath, nextState, {
      expectedFingerprint: loadedState.fingerprint,
      expectedState: "RUNNING"
    });
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    raisePostAppendStateWriteFailed({
      envelopeId: appendResult.envelope.id,
      reason,
      createError: (message) => new PassCommandError(message)
    });
  }

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

  return {
    bubbleId: resolved.bubbleId,
    sequence: mapped.sequence,
    envelope: mapped.envelope,
    resultEnvelopeKind: "pass",
    state: written.state,
    inferredIntent,
    transitionDecision: "normal_pass",
    repeatCleanReasonCode: repeatCleanTrigger.reasonCode,
    repeatCleanReasonDetail: repeatCleanTrigger.reasonDetail,
    repeatCleanTrigger: repeatCleanTrigger.trigger,
    mostRecentPreviousReviewerCleanPassEnvelope,
    ...(deliveryResult !== undefined
      ? {
          delivery: {
            delivered: deliveryResult.delivered,
            ...(deliveryResult.reason !== undefined
              ? { reason: deliveryResult.reason }
              : {}),
            retried: deliveryRetried
          }
        }
      : {}),
    ...(docGateArtifactWriteFailureReason !== undefined
      ? {
          docGateArtifactWriteFailureReason
        }
      : {})
  };
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
