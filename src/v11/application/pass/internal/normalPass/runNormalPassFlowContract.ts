import type {
  RepeatCleanAutoconvergeReasonCode,
  RepeatCleanAutoconvergeReasonDetail
} from "../../../../domain/convergence/repeatCleanAutoconverge.js";
import type { ReviewerTestExecutionDirective } from "../../../../shared/reviewer/testEvidence.js";
import type { ReviewVerificationInputResolution } from "../../../../shared/reviewer/reviewVerification.js";
import type { DeliveryAck } from "../../../../ports/tmuxDelivery.js";
import type { LoadedStateSnapshot } from "../../../../ports/stateSnapshots.js";
import type { AgentName } from "../../../../../contracts/kernel/agentIdentity.js";
import type { BubbleConfig } from "../../../../shared/config/bubbleConfigTypes.js";
import type { BubbleStateSnapshot } from "../../../../domain/state/snapshot/bubbleStateSnapshot.js";
import type { Finding } from "../../../../../contracts/kernel/findings.js";
import type { PassIntent } from "../../../../../contracts/kernel/protocol.js";
import type { ProtocolEnvelope } from "../../../../shared/protocol/protocolEnvelopeContract.js";
import type {
  PassRecipientRole,
  PassSenderRole,
  ResolvedPassHandoff
} from "../../../../domain/pass/handoff.js";
import type {
  ReviewerFindingsClaim,
  ReviewerFindingsClaimParserMetadata
} from "../../../../domain/pass/reviewerFindingsClaim.js";
import type { evaluateReviewerGateWarnings } from "../../../../shared/gates/docContractGates.js";
import type { PassActivationProvenance } from "../../passCommandContract.js";

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
  activation?: PassActivationProvenance;
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
  createError: PairflowCreateCommandError;
}

export interface RunNormalPassFlowDependencies<TResult> {
  prepareNormalPassAppend: (input: {
    senderRole: PassSenderRole;
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
    envelope: ProtocolEnvelope<"PASS">;
  }>;
  resolvePassValidationForPass: (input: {
    senderRole: "implementer" | "reviewer";
    bubbleId: string;
    bubbleConfig: BubbleConfig;
    worktreePath: string;
    artifactsDir: string;
    round: number;
    now: Date;
    createError: PairflowCreateCommandError;
  }) => Promise<{
    reviewerTestDirective?: ReviewerTestExecutionDirective;
    validationRefs: string[];
    compatibilityArtifactWriteFailureReason?: string;
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
    createError: PairflowCreateCommandError;
  }) => Promise<{
    written: LoadedStateSnapshot;
    docGateArtifactWriteFailureReason?: string;
  }>;
  executeNormalPassDelivery: (input: {
    senderRole: PassSenderRole;
    bubbleId: string;
    bubbleConfig: BubbleConfig;
    envelope: ProtocolEnvelope<"PASS">;
    worktreePath: string;
    repoPath: string;
    artifactsDir: string;
    sessionsPath: string;
    reviewerBriefArtifactPath: string;
    reviewerFocusArtifactPath: string;
    recipientRole: PassRecipientRole;
    now: Date;
    reviewerTestDirective?: ReviewerTestExecutionDirective;
  }) => Promise<{
    reviewerTestDirective?: ReviewerTestExecutionDirective;
    deliveryResult: DeliveryAck | undefined;
    deliveryRetried: boolean;
  }>;
  finalizeNormalPass: (input: {
    now: Date;
    repoPath: string;
    bubbleId: string;
    bubbleInstanceId: string;
    round: number;
    actorRole: PassSenderRole;
    passIntent: PassIntent;
    inferredIntent: boolean;
    sender: AgentName;
    recipient: AgentName;
    recipientRole: PassRecipientRole;
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
    passValidationCompatibilityArtifactWriteFailureReason?: string;
    findings: Finding[];
    docGateArtifactWriteFailureReason?: string;
    sequence: number;
    envelope: ProtocolEnvelope<"PASS">;
    state: BubbleStateSnapshot;
    activation?: PassActivationProvenance;
    deliveryResult: DeliveryAck | undefined;
    deliveryRetried: boolean;
  }) => Promise<TResult>;
}
