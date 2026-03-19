import { readFile } from "node:fs/promises";
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
  emitTmuxDeliveryNotification,
  resolveDeliveryMessageRef
} from "../runtime/tmuxDelivery.js";
import { ensureBubbleInstanceIdForMutation } from "../bubble/bubbleInstanceId.js";
import { emitBubbleLifecycleEventBestEffort } from "../metrics/bubbleEvents.js";
import {
  deliveryTargetRoleMetadataKey,
  isPassIntent,
  type PassIntent,
  type ProtocolEnvelope
} from "../../types/protocol.js";
import type { Finding } from "../../types/findings.js";
import type {
  AgentRole,
  BubbleConfig,
  BubbleFailingGate,
  BubbleStateSnapshot
} from "../../types/bubble.js";
import { refreshReviewerContext } from "../runtime/reviewerContext.js";
import {
  resolveReviewerTestEvidenceArtifactPath,
  resolveReviewerTestExecutionDirectiveFromArtifact,
  type ReviewerTestExecutionDirective,
  verifyImplementerTestEvidence,
  writeReviewerTestEvidenceArtifact
} from "../reviewer/testEvidence.js";
import {
  createReviewVerificationArtifact,
  writeReviewVerificationArtifactAtomic
} from "../reviewer/reviewVerification.js";
import {
  formatReviewerBriefPrompt,
  formatReviewerFocusBridgeBlock,
  readReviewerBriefArtifact,
  readReviewerFocusArtifact
} from "../reviewer/reviewerBrief.js";
import {
  createDocContractGateArtifact,
  type DocContractGateArtifact,
  evaluateReviewerGateWarnings,
  isDocContractGateScopeActive,
  mergeArtifactWithReviewerEvaluation,
  readDocContractGateArtifact,
  resolveDocContractGateArtifactPath,
  writeDocContractGateArtifact
} from "../gates/docContractGates.js";
import {
  claimParserDivergenceDiagnosticReasonCode,
  validateConvergencePolicy
} from "../convergence/policy.js";
import {
  evaluateRepeatCleanAutoconvergeTrigger,
  repeatCleanAutoconvergeTriggeredReasonCode,
  type RepeatCleanAutoconvergeReasonCode,
  type RepeatCleanAutoconvergeReasonDetail
} from "../convergence/repeatCleanAutoconverge.js";
import {
  emitConvergedFromWorkspace,
  type EmitConvergedDependencies,
  type EmitConvergedResult
} from "./converged.js";
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
import { raisePostAppendReviewVerificationWriteFailed } from "../../v11/domain/pass/postAppendReviewVerificationWriteFailure.js";
import { raisePostAppendStateWriteFailed } from "../../v11/domain/pass/postAppendStateWriteFailure.js";
import {
  buildRepeatCleanLifecycleMetadata,
  buildRepeatCleanPassPayloadMetadata,
  resolveMostRecentPreviousReviewerPassIsCleanFromMetadata as resolveMostRecentPreviousReviewerPassIsCleanFromMetadataV11
} from "../../v11/domain/pass/repeatCleanMetadata.js";
import { buildFindingCounts } from "../../v11/domain/pass/findingCounts.js";

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

export interface EmitPassDependencies {
  emitTmuxDeliveryNotification?: typeof emitTmuxDeliveryNotification;
  emitBubbleNotification?: EmitConvergedDependencies["emitBubbleNotification"];
  refreshReviewerContext?: typeof refreshReviewerContext;
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

function createDocGateReadFailureWarning(input: {
  artifactPath: string;
  reason: string;
}): BubbleFailingGate {
  return {
    gate_id: "review.serialization",
    reason_code: "STATUS_GATE_SERIALIZATION_WARNING",
    message:
      `Doc gate artifact could not be read during reviewer PASS; preserving advisory fail-open with reset gate baseline. reason=${input.reason}`,
    priority: "P2",
    timing: "later-hardening",
    layer: "L1",
    signal_level: "warning",
    evidence_refs: [input.artifactPath]
  };
}

function extractTaskContentFromTaskArtifact(taskArtifactContent: string): string {
  const match = /^# Bubble Task\r?\n\r?\nSource: [^\n]*\r?\n\r?\n([\s\S]*)$/u
    .exec(taskArtifactContent);
  if (match?.[1] !== undefined) {
    return match[1].trimEnd();
  }
  return taskArtifactContent;
}

async function updateReviewerDocGateArtifact(input: {
  now: Date;
  bubbleConfig: BubbleConfig;
  artifactsDir: string;
  taskArtifactPath: string;
  round: number;
  findings: Finding[];
  reviewerEvaluation?: ReturnType<typeof evaluateReviewerGateWarnings>;
}): Promise<string | undefined> {
  if (
    !isDocContractGateScopeActive({
      reviewArtifactType: input.bubbleConfig.review_artifact_type
    })
  ) {
    return undefined;
  }

  const gateArtifactPath = resolveDocContractGateArtifactPath(
    input.artifactsDir
  );
  let baseArtifact: DocContractGateArtifact | undefined;
  let gateReadWarning: BubbleFailingGate | undefined;
  try {
    baseArtifact = await readDocContractGateArtifact(gateArtifactPath);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    gateReadWarning = createDocGateReadFailureWarning({
      artifactPath: gateArtifactPath,
      reason
    });
  }
  let fallbackArtifact: DocContractGateArtifact | undefined;
  if (baseArtifact === undefined) {
    fallbackArtifact = createDocContractGateArtifact({
      now: input.now,
      bubbleConfig: input.bubbleConfig,
      taskContent: ""
    });
    const taskArtifactContent = await readFile(
      input.taskArtifactPath,
      "utf8"
    ).catch(() => undefined);
    if (taskArtifactContent !== undefined) {
      fallbackArtifact.task_warnings = createDocContractGateArtifact({
        now: input.now,
        bubbleConfig: input.bubbleConfig,
        taskContent: extractTaskContentFromTaskArtifact(taskArtifactContent)
      }).task_warnings;
    }
    if (gateReadWarning !== undefined) {
      fallbackArtifact.config_warnings = [
        ...fallbackArtifact.config_warnings,
        gateReadWarning
      ];
    }
  }
  const reviewEvaluation =
    input.reviewerEvaluation
    ?? evaluateReviewerGateWarnings({
      round: input.round,
      findings: input.findings,
      roundGateAppliesAfter:
        input.bubbleConfig.doc_contract_gates.round_gate_applies_after
    });
  const artifactForMerge = baseArtifact ?? fallbackArtifact;
  if (artifactForMerge === undefined) {
    throw new PassCommandError(
      "Doc gate artifact fallback invariant violated during reviewer PASS."
    );
  }
  const nextArtifact = mergeArtifactWithReviewerEvaluation({
    now: input.now,
    artifact: artifactForMerge,
    reviewerEvaluation: reviewEvaluation
  });
  try {
    await writeDocContractGateArtifact(gateArtifactPath, nextArtifact);
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }

  return undefined;
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
        findings: autoConvergeFindings
      });
    }

    await emitBubbleLifecycleEventBestEffort({
      repoPath: resolved.repoPath,
      bubbleId: resolved.bubbleId,
      bubbleInstanceId: bubbleIdentity.bubbleInstanceId,
      eventType: "bubble_passed",
      round: handoff.envelopeRound,
      actorRole: handoff.senderRole,
      metadata: {
        pass_intent: intent,
        inferred_intent: inferredIntent,
        sender: handoff.senderAgent,
        recipient: "human",
        recipient_role: "human",
        refs_count: refs.length,
        has_findings: hasFindings,
        no_findings: noFindings,
        ...(reviewerFindingsClaim !== undefined
          ? {
              findings_claim_state: reviewerFindingsClaim.state,
              findings_claim_source: reviewerFindingsClaim.source
            }
          : {}),
        ...(reviewerFindingsClaimParserMetadata !== undefined
          ? {
              findings_claim_parser_state:
                reviewerFindingsClaimParserMetadata.parserState,
              findings_claim_parser_divergence:
                reviewerFindingsClaimParserMetadata.parserDivergence
            }
          : {}),
        ...buildRepeatCleanLifecycleMetadata({
          transitionDecision: "auto_converge",
          reasonCode: repeatCleanTrigger.reasonCode,
          reasonDetail: repeatCleanTrigger.reasonDetail,
          trigger: repeatCleanTrigger.trigger,
          mostRecentPreviousReviewerCleanPassEnvelope:
            repeatCleanTrigger.mostRecentPreviousReviewerCleanPassEnvelope
        }),
        ...buildFindingCounts(autoConvergeFindings),
        ...(autoConvergeDocGateArtifactWriteFailureReason !== undefined
          ? {
              doc_gate_artifact_write_failed: true,
              doc_gate_artifact_write_failure_reason:
                autoConvergeDocGateArtifactWriteFailureReason
            }
          : {})
      },
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
    envelope: {
      bubble_id: resolved.bubbleId,
      sender: handoff.senderAgent,
      recipient: handoff.recipientAgent,
      type: "PASS",
      round: handoff.envelopeRound,
      payload: {
        summary,
        pass_intent: intent,
        metadata: {
          ...buildRepeatCleanPassPayloadMetadata({
            transitionDecision: "normal_pass",
            reasonCode: repeatCleanTrigger.reasonCode,
            reasonDetail: repeatCleanTrigger.reasonDetail,
            trigger: repeatCleanTrigger.trigger,
            mostRecentPreviousReviewerCleanPassEnvelope:
              repeatCleanTrigger.mostRecentPreviousReviewerCleanPassEnvelope
          }),
          [deliveryTargetRoleMetadataKey]: handoff.recipientRole,
          ...(reviewerFindingsClaimParserMetadata !== undefined
            ? {
                findings_claim_parser_state:
                  reviewerFindingsClaimParserMetadata.parserState,
                findings_claim_parser_divergence:
                  reviewerFindingsClaimParserMetadata.parserDivergence,
                ...(reviewerFindingsClaimParserMetadata.parserDivergence
                  ? {
                      findings_claim_parser_divergence_reason_code:
                        claimParserDivergenceDiagnosticReasonCode
                    }
                  : {})
              }
            : {})
        },
        ...(handoff.senderRole === "reviewer"
          ? {
              findings: hasFindings ? findingsForPayload : [],
              findings_claim_state: reviewerFindingsClaim?.state ?? "unknown",
              findings_claim_source:
                reviewerFindingsClaim?.source ?? "payload_findings_count"
            }
          : {})
      },
      refs
    }
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
      ...(reviewerGateEvaluation !== undefined
        ? { reviewerEvaluation: reviewerGateEvaluation }
        : {})
    });
  }

  let reviewerTestDirective: ReviewerTestExecutionDirective | undefined;
  if (handoff.senderRole === "implementer") {
    let implementerDirective: ReviewerTestExecutionDirective | undefined
    const evidenceArtifactPath = resolveReviewerTestEvidenceArtifactPath(
      resolved.bubblePaths.artifactsDir
    );

    const evidenceArtifact = await verifyImplementerTestEvidence({
      bubbleId: resolved.bubbleId,
      bubbleConfig: resolved.bubbleConfig,
      envelope: mapped.envelope,
      worktreePath: resolved.bubblePaths.worktreePath,
      repoPath: resolved.repoPath,
      now
    }).catch(() => undefined);

    if (evidenceArtifact !== undefined) {
      const artifactWriteSucceeded = await writeReviewerTestEvidenceArtifact(
        evidenceArtifactPath,
        evidenceArtifact
      )
        .then(() => true)
        .catch(() => false);
      if (artifactWriteSucceeded) {
        implementerDirective = await resolveReviewerTestExecutionDirectiveFromArtifact({
          artifact: evidenceArtifact,
          worktreePath: resolved.bubblePaths.worktreePath,
          reviewArtifactType: resolved.bubbleConfig.review_artifact_type
        }).catch(() => undefined);
      }
    }

    reviewerTestDirective =
      implementerDirective ??
      (resolved.bubbleConfig.review_artifact_type === "document"
        ? {
            skip_full_rerun: true,
            reason_code: "no_trigger",
            reason_detail: "docs-only scope, runtime checks not required",
            verification_status: "trusted"
          }
        : {
            skip_full_rerun: false,
            reason_code: "evidence_unverifiable",
            reason_detail:
              "Failed to resolve reviewer test directive due to verification runtime error.",
            verification_status: "untrusted"
          });
  }

  const reviewerBriefText = await readReviewerBriefArtifact(
    resolved.bubblePaths.reviewerBriefArtifactPath
  ).catch(() => undefined);
  const reviewerFocus = await readReviewerFocusArtifact(
    resolved.bubblePaths.reviewerFocusArtifactPath
  ).catch(() => undefined);
  const reviewerStartupContextBlocks: string[] = [];
  if (reviewerBriefText !== undefined) {
    reviewerStartupContextBlocks.push(formatReviewerBriefPrompt(reviewerBriefText));
  }
  if (reviewerFocus?.status === "present") {
    reviewerStartupContextBlocks.push(
      formatReviewerFocusBridgeBlock(reviewerFocus)
    );
  }
  const reviewerStartupPrompt =
    reviewerStartupContextBlocks.length > 0
      ? reviewerStartupContextBlocks.join("\n\n")
      : undefined;

  const refreshReviewer =
    dependencies.refreshReviewerContext ?? refreshReviewerContext;
  let deliveryInitialDelayMs: number | undefined;
  if (
    handoff.senderRole === "implementer" &&
    resolved.bubbleConfig.reviewer_context_mode === "fresh"
  ) {
    // Best effort only; protocol/state progression must not fail if tmux refresh fails.
    const refreshResult = await refreshReviewer({
      bubbleId: resolved.bubbleId,
      bubbleConfig: resolved.bubbleConfig,
      sessionsPath: resolved.bubblePaths.sessionsPath,
      ...(reviewerStartupPrompt !== undefined
        ? { reviewerStartupPrompt }
        : {})
    }).catch(() => undefined);
    if (refreshResult?.refreshed === true) {
      // Give the respawned reviewer CLI a short warm-up before delivery injection.
      deliveryInitialDelayMs = 1500;
    }
  }

  const emitDelivery =
    dependencies.emitTmuxDeliveryNotification ?? emitTmuxDeliveryNotification;
  const deliveryInput = {
    bubbleId: resolved.bubbleId,
    bubbleConfig: resolved.bubbleConfig,
    sessionsPath: resolved.bubblePaths.sessionsPath,
    envelope: mapped.envelope,
    messageRef: resolveDeliveryMessageRef({
      bubbleId: resolved.bubbleId,
      sessionsPath: resolved.bubblePaths.sessionsPath,
      envelope: mapped.envelope
    }),
    ...(reviewerTestDirective !== undefined ? { reviewerTestDirective } : {}),
    ...(reviewerBriefText !== undefined ? { reviewerBrief: reviewerBriefText } : {}),
    ...(
      handoff.senderRole === "implementer" &&
      reviewerFocus?.status === "present"
        ? { reviewerFocus }
        : {}
    ),
    ...(deliveryInitialDelayMs !== undefined ? { initialDelayMs: deliveryInitialDelayMs } : {})
  };
  let deliveryResult = await emitDelivery(deliveryInput).catch(() => undefined);
  let deliveryRetried = false;
  const shouldRetryDelivery =
    handoff.senderRole === "implementer"
    && handoff.recipientRole === "reviewer"
    && (
      deliveryResult?.reason === "delivery_unconfirmed"
      || deliveryResult?.reason === "tmux_send_failed"
    );
  if (shouldRetryDelivery) {
    deliveryRetried = true;
    deliveryResult = await emitDelivery({
      ...deliveryInput,
      // Respawned reviewer CLIs can take a few seconds to become input-ready.
      // Retry once with a longer warm-up window before giving up.
      initialDelayMs: 5000,
      deliveryAttempts: 6
    }).catch(() => deliveryResult);
  }

  await emitBubbleLifecycleEventBestEffort({
    repoPath: resolved.repoPath,
    bubbleId: resolved.bubbleId,
    bubbleInstanceId: bubbleIdentity.bubbleInstanceId,
    eventType: "bubble_passed",
    round: handoff.envelopeRound,
    actorRole: handoff.senderRole,
    metadata: {
      pass_intent: intent,
      inferred_intent: inferredIntent,
      sender: handoff.senderAgent,
      recipient: handoff.recipientAgent,
      recipient_role: handoff.recipientRole,
      refs_count: refs.length,
      has_findings: hasFindings,
      no_findings: noFindings,
      ...(reviewerFindingsClaim !== undefined
        ? {
            findings_claim_state: reviewerFindingsClaim.state,
            findings_claim_source: reviewerFindingsClaim.source
          }
        : {}),
      ...(reviewerFindingsClaimParserMetadata !== undefined
        ? {
            findings_claim_parser_state:
              reviewerFindingsClaimParserMetadata.parserState,
            findings_claim_parser_divergence:
              reviewerFindingsClaimParserMetadata.parserDivergence
          }
        : {}),
      ...buildRepeatCleanLifecycleMetadata({
        transitionDecision: "normal_pass",
        reasonCode: repeatCleanTrigger.reasonCode,
        reasonDetail: repeatCleanTrigger.reasonDetail,
        trigger: repeatCleanTrigger.trigger,
        mostRecentPreviousReviewerCleanPassEnvelope:
          repeatCleanTrigger.mostRecentPreviousReviewerCleanPassEnvelope
      }),
      ...(reviewerTestDirective !== undefined
        ? {
            reviewer_test_evidence_decision: reviewerTestDirective.skip_full_rerun
              ? "skip_full_rerun"
              : "run_checks",
            reviewer_test_evidence_reason_code: reviewerTestDirective.reason_code,
            reviewer_test_evidence_verification_status:
              reviewerTestDirective.verification_status
          }
        : {}),
      ...buildFindingCounts(
        handoff.senderRole === "reviewer" ? findingsForPayload : findings
      ),
      ...(docGateArtifactWriteFailureReason !== undefined
        ? {
            doc_gate_artifact_write_failed: true,
            doc_gate_artifact_write_failure_reason:
              docGateArtifactWriteFailureReason
          }
        : {})
      },
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
