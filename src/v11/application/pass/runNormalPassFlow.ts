import type {
  RepeatCleanAutoconvergeReasonCode,
  RepeatCleanAutoconvergeReasonDetail
} from "../../../core/convergence/repeatCleanAutoconverge.js";
import type { EmitTmuxDeliveryNotificationResult } from "../../../core/runtime/tmuxDelivery.js";
import type { ReviewVerificationInputResolution } from "../../../core/reviewer/reviewVerification.js";
import type { LoadedStateSnapshot } from "../../../core/state/stateStore.js";
import type { AgentName, BubbleConfig, BubbleStateSnapshot } from "../../../types/bubble.js";
import type { Finding } from "../../../types/findings.js";
import type { PassIntent, ProtocolEnvelope } from "../../../types/protocol.js";
import type { ReviewerTestExecutionDirective } from "../../../core/reviewer/testEvidence.js";
import type { ResolvedPassHandoff } from "../../domain/pass/handoff.js";
import type {
  ReviewerFindingsClaim,
  ReviewerFindingsClaimParserMetadata
} from "../../domain/pass/reviewerFindingsClaim.js";
import type { evaluateReviewerGateWarnings } from "../../../core/gates/docContractGates.js";

interface NormalPassPathsInput {
  transcriptPath: string;
  reviewVerificationArtifactPath: string;
  statePath: string;
  artifactsDir: string;
  taskArtifactPath: string;
  worktreePath: string;
  sessionsPath: string;
  reviewerBriefArtifactPath: string;
  reviewerFocusArtifactPath: string;
  locksDir: string;
}

interface RepeatCleanMetadataInput {
  reasonCode: RepeatCleanAutoconvergeReasonCode;
  reasonDetail: RepeatCleanAutoconvergeReasonDetail;
  trigger: boolean;
  mostRecentPreviousReviewerCleanPassEnvelope: boolean;
}

export interface RunNormalPassFlowInput {
  now: Date;
  nowIso: string;
  summary: string;
  intent: PassIntent;
  refs: string[];
  hasFindings: boolean;
  noFindings: boolean;
  findings: Finding[];
  inferredIntent: boolean;
  reviewerVerification: ReviewVerificationInputResolution | undefined;
  state: BubbleStateSnapshot;
  expectedStateFingerprint: string;
  bubbleId: string;
  bubbleInstanceId: string;
  repoPath: string;
  bubbleConfig: BubbleConfig;
  paths: NormalPassPathsInput;
  handoff: Pick<
    ResolvedPassHandoff,
    "senderRole" | "senderAgent" | "recipientAgent" | "recipientRole" | "envelopeRound" | "nextRound" | "appendRoundRoleEntry"
  >;
  reviewerFindingsClaim?: ReviewerFindingsClaim;
  reviewerFindingsClaimParserMetadata?: ReviewerFindingsClaimParserMetadata;
  repeatClean: RepeatCleanMetadataInput;
  createError: (message: string) => Error;
}

export interface RunNormalPassFlowDependencies<TResult> {
  prepareNormalPassAppend: (input: {
    senderRole: "implementer" | "reviewer";
    reviewArtifactType: BubbleConfig["review_artifact_type"];
    round: number;
    findings: Finding[];
    hasFindings: boolean;
    roundGateAppliesAfter: number;
    locksDir: string;
    bubbleId: string;
  }) => {
    docGateScopeActive: boolean;
    reviewerGateEvaluation?: ReturnType<typeof evaluateReviewerGateWarnings>;
    findingsForPayload: Finding[];
    lockPath: string;
  };
  executeNormalPassAppend: (input: {
    transcriptPath: string;
    lockPath: string;
    now: Date;
    bubbleId: string;
    handoff: Pick<
      ResolvedPassHandoff,
      "senderAgent" | "recipientAgent" | "senderRole" | "recipientRole" | "envelopeRound"
    >;
    summary: string;
    passIntent: PassIntent;
    refs: string[];
    hasFindings: boolean;
    findingsForPayload: Finding[];
    reviewerFindingsClaim?: ReviewerFindingsClaim;
    reviewerFindingsClaimParserMetadata?: ReviewerFindingsClaimParserMetadata;
    repeatCleanReasonCode: RepeatCleanAutoconvergeReasonCode;
    repeatCleanReasonDetail: RepeatCleanAutoconvergeReasonDetail;
    repeatCleanTrigger: boolean;
    mostRecentPreviousReviewerCleanPassEnvelope: boolean;
  }) => Promise<{
    sequence: number;
    envelope: ProtocolEnvelope;
  }>;
  persistNormalPassPostAppend: (input: {
    reviewerVerification: ReviewVerificationInputResolution | undefined;
    bubbleId: string;
    handoff: Pick<
      ResolvedPassHandoff,
      "nextRound" | "senderAgent" | "envelopeRound" | "recipientAgent" | "recipientRole" | "appendRoundRoleEntry"
    >;
    generatedAt: string;
    reviewVerificationArtifactPath: string;
    mappedEnvelopeId: string;
    statePath: string;
    state: BubbleStateSnapshot;
    expectedFingerprint: string;
    appendEnvelopeId: string;
    docGateScopeActive: boolean;
    now: Date;
    bubbleConfig: BubbleConfig;
    artifactsDir: string;
    taskArtifactPath: string;
    hasFindings: boolean;
    findings: Finding[];
    reviewerGateEvaluation?: ReturnType<typeof evaluateReviewerGateWarnings>;
    createError: (message: string) => Error;
  }) => Promise<{
    written: LoadedStateSnapshot;
    docGateArtifactWriteFailureReason?: string;
  }>;
  executeNormalPassDelivery: (input: {
    senderRole: "implementer" | "reviewer";
    bubbleId: string;
    bubbleConfig: BubbleConfig;
    envelope: ProtocolEnvelope;
    worktreePath: string;
    repoPath: string;
    artifactsDir: string;
    sessionsPath: string;
    reviewerBriefArtifactPath: string;
    reviewerFocusArtifactPath: string;
    recipientRole: "implementer" | "reviewer";
    now: Date;
  }) => Promise<{
    reviewerTestDirective?: ReviewerTestExecutionDirective;
    deliveryResult: EmitTmuxDeliveryNotificationResult | undefined;
    deliveryRetried: boolean;
  }>;
  finalizeNormalPass: (input: {
    now: Date;
    repoPath: string;
    bubbleId: string;
    bubbleInstanceId: string;
    round: number;
    actorRole: "implementer" | "reviewer";
    passIntent: PassIntent;
    inferredIntent: boolean;
    sender: AgentName;
    recipient: AgentName;
    recipientRole: "implementer" | "reviewer";
    refsCount: number;
    hasFindings: boolean;
    noFindings: boolean;
    reviewerFindingsClaim?: ReviewerFindingsClaim;
    reviewerFindingsClaimParserMetadata?: ReviewerFindingsClaimParserMetadata;
    repeatCleanReasonCode: RepeatCleanAutoconvergeReasonCode;
    repeatCleanReasonDetail: RepeatCleanAutoconvergeReasonDetail;
    repeatCleanTrigger: boolean;
    fallbackMostRecentPreviousReviewerCleanPassEnvelope: boolean;
    reviewerTestDirective?: ReviewerTestExecutionDirective;
    findings: Finding[];
    docGateArtifactWriteFailureReason?: string;
    sequence: number;
    envelope: ProtocolEnvelope;
    state: BubbleStateSnapshot;
    deliveryResult: EmitTmuxDeliveryNotificationResult | undefined;
    deliveryRetried: boolean;
  }) => Promise<TResult>;
}

function buildFinalizeNormalPassInput<TResult>(input: {
  flowInput: RunNormalPassFlowInput;
  findingsForPayload: Finding[];
  docGateArtifactWriteFailureReason?: string;
  mapped: {
    sequence: number;
    envelope: ProtocolEnvelope;
  };
  written: LoadedStateSnapshot;
  normalPassDelivery: {
    reviewerTestDirective?: ReviewerTestExecutionDirective;
    deliveryResult: EmitTmuxDeliveryNotificationResult | undefined;
    deliveryRetried: boolean;
  };
}): Parameters<RunNormalPassFlowDependencies<TResult>["finalizeNormalPass"]>[0] {
  return {
    now: input.flowInput.now,
    repoPath: input.flowInput.repoPath,
    bubbleId: input.flowInput.bubbleId,
    bubbleInstanceId: input.flowInput.bubbleInstanceId,
    round: input.flowInput.handoff.envelopeRound,
    actorRole: input.flowInput.handoff.senderRole,
    passIntent: input.flowInput.intent,
    inferredIntent: input.flowInput.inferredIntent,
    sender: input.flowInput.handoff.senderAgent,
    recipient: input.flowInput.handoff.recipientAgent,
    recipientRole: input.flowInput.handoff.recipientRole,
    refsCount: input.flowInput.refs.length,
    hasFindings: input.flowInput.hasFindings,
    noFindings: input.flowInput.noFindings,
    ...(input.flowInput.reviewerFindingsClaim !== undefined
      ? { reviewerFindingsClaim: input.flowInput.reviewerFindingsClaim }
      : {}),
    ...(input.flowInput.reviewerFindingsClaimParserMetadata !== undefined
      ? {
          reviewerFindingsClaimParserMetadata:
            input.flowInput.reviewerFindingsClaimParserMetadata
        }
      : {}),
    repeatCleanReasonCode: input.flowInput.repeatClean.reasonCode,
    repeatCleanReasonDetail: input.flowInput.repeatClean.reasonDetail,
    repeatCleanTrigger: input.flowInput.repeatClean.trigger,
    fallbackMostRecentPreviousReviewerCleanPassEnvelope:
      input.flowInput.repeatClean.mostRecentPreviousReviewerCleanPassEnvelope,
    ...(input.normalPassDelivery.reviewerTestDirective !== undefined
      ? { reviewerTestDirective: input.normalPassDelivery.reviewerTestDirective }
      : {}),
    findings: input.flowInput.handoff.senderRole === "reviewer"
      ? input.findingsForPayload
      : input.flowInput.findings,
    ...(input.docGateArtifactWriteFailureReason !== undefined
      ? { docGateArtifactWriteFailureReason: input.docGateArtifactWriteFailureReason }
      : {}),
    sequence: input.mapped.sequence,
    envelope: input.mapped.envelope,
    state: input.written.state,
    deliveryResult: input.normalPassDelivery.deliveryResult,
    deliveryRetried: input.normalPassDelivery.deliveryRetried
  };
}

export async function runNormalPassFlow<TResult>(
  input: RunNormalPassFlowInput,
  dependencies: RunNormalPassFlowDependencies<TResult>
): Promise<TResult> {
  const normalPassAppendPreparation = dependencies.prepareNormalPassAppend({
    senderRole: input.handoff.senderRole,
    reviewArtifactType: input.bubbleConfig.review_artifact_type,
    round: input.handoff.envelopeRound,
    findings: input.findings,
    hasFindings: input.hasFindings,
    roundGateAppliesAfter:
      input.bubbleConfig.doc_contract_gates.round_gate_applies_after,
    locksDir: input.paths.locksDir,
    bubbleId: input.bubbleId
  });
  const docGateScopeActive = normalPassAppendPreparation.docGateScopeActive;
  const reviewerGateEvaluation = normalPassAppendPreparation.reviewerGateEvaluation;
  const findingsForPayload = normalPassAppendPreparation.findingsForPayload;
  const lockPath = normalPassAppendPreparation.lockPath;

  const mapped = await dependencies.executeNormalPassAppend({
    transcriptPath: input.paths.transcriptPath,
    lockPath,
    now: input.now,
    bubbleId: input.bubbleId,
    handoff: input.handoff,
    summary: input.summary,
    passIntent: input.intent,
    refs: input.refs,
    hasFindings: input.hasFindings,
    findingsForPayload,
    ...(input.reviewerFindingsClaim !== undefined
      ? { reviewerFindingsClaim: input.reviewerFindingsClaim }
      : {}),
    ...(input.reviewerFindingsClaimParserMetadata !== undefined
      ? { reviewerFindingsClaimParserMetadata: input.reviewerFindingsClaimParserMetadata }
      : {}),
    repeatCleanReasonCode: input.repeatClean.reasonCode,
    repeatCleanReasonDetail: input.repeatClean.reasonDetail,
    repeatCleanTrigger: input.repeatClean.trigger,
    mostRecentPreviousReviewerCleanPassEnvelope:
      input.repeatClean.mostRecentPreviousReviewerCleanPassEnvelope
  });

  const postAppendPersistence = await dependencies.persistNormalPassPostAppend({
    reviewerVerification: input.reviewerVerification,
    bubbleId: input.bubbleId,
    handoff: input.handoff,
    generatedAt: input.nowIso,
    reviewVerificationArtifactPath: input.paths.reviewVerificationArtifactPath,
    mappedEnvelopeId: mapped.envelope.id,
    statePath: input.paths.statePath,
    state: input.state,
    expectedFingerprint: input.expectedStateFingerprint,
    appendEnvelopeId: mapped.envelope.id,
    docGateScopeActive,
    now: input.now,
    bubbleConfig: input.bubbleConfig,
    artifactsDir: input.paths.artifactsDir,
    taskArtifactPath: input.paths.taskArtifactPath,
    hasFindings: input.hasFindings,
    findings: input.findings,
    ...(reviewerGateEvaluation !== undefined
      ? { reviewerGateEvaluation }
      : {}),
    createError: input.createError
  });
  const written = postAppendPersistence.written;
  const docGateArtifactWriteFailureReason =
    postAppendPersistence.docGateArtifactWriteFailureReason;

  const normalPassDelivery = await dependencies.executeNormalPassDelivery({
    senderRole: input.handoff.senderRole,
    bubbleId: input.bubbleId,
    bubbleConfig: input.bubbleConfig,
    envelope: mapped.envelope,
    worktreePath: input.paths.worktreePath,
    repoPath: input.repoPath,
    artifactsDir: input.paths.artifactsDir,
    sessionsPath: input.paths.sessionsPath,
    reviewerBriefArtifactPath: input.paths.reviewerBriefArtifactPath,
    reviewerFocusArtifactPath: input.paths.reviewerFocusArtifactPath,
    recipientRole: input.handoff.recipientRole,
    now: input.now
  });
  return dependencies.finalizeNormalPass(
    buildFinalizeNormalPassInput({
      flowInput: input,
      findingsForPayload,
      ...(docGateArtifactWriteFailureReason !== undefined
        ? { docGateArtifactWriteFailureReason }
        : {}),
      mapped,
      written,
      normalPassDelivery
    })
  );
}
