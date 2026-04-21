import type { BubbleStateSnapshot } from "../../../types/bubble.js";
import type { Finding } from "../../../types/findings.js";
import type { PassIntent, ProtocolEnvelope } from "../../../types/protocol.js";
import type {
  RepeatCleanAutoconvergeReasonCode,
  RepeatCleanAutoconvergeReasonDetail
} from "../../../v11/domain/convergence/repeatCleanAutoconverge.js";
import type { ReviewerTestExecutionDirective } from "../../../v11/shared/reviewer/testEvidence.js";
import type {
  BuildPassLifecycleMetricMetadataInput
} from "../../domain/pass/lifecycleMetricMetadata.js";
import type {
  ReviewerFindingsClaim,
  ReviewerFindingsClaimParserMetadata
} from "../../domain/pass/reviewerFindingsClaim.js";
import type { DeliveryAck } from "../../shared/ports/tmuxDelivery.js";
import type { PassActivationProvenance } from "./passCommandContract.js";

export interface FinalizeNormalPassInput {
  now: Date;
  repoPath: string;
  bubbleId: string;
  bubbleInstanceId: string;
  round: number;
  actorRole: "implementer" | "reviewer";
  passIntent: PassIntent;
  inferredIntent: boolean;
  sender: BuildPassLifecycleMetricMetadataInput["sender"];
  recipient: BuildPassLifecycleMetricMetadataInput["recipient"];
  recipientRole: BuildPassLifecycleMetricMetadataInput["recipientRole"];
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
  envelope: ProtocolEnvelope;
  state: BubbleStateSnapshot;
  activation?: PassActivationProvenance;
  deliveryResult: DeliveryAck | undefined;
  deliveryRetried: boolean;
}

export interface FinalizeNormalPassDependencies<TResult> {
  emitBubbleLifecycleEventBestEffort: (input: {
    repoPath: string;
    bubbleId: string;
    bubbleInstanceId: string;
    eventType: "bubble_passed";
    round: number;
    actorRole: "implementer" | "reviewer";
    metadata: Record<string, unknown>;
    now: Date;
  }) => Promise<void>;
  buildPassLifecycleMetricMetadata: (
    input: BuildPassLifecycleMetricMetadataInput
  ) => Record<string, unknown>;
  resolveMostRecentPreviousReviewerPassIsCleanFromMetadata: (
    metadata: Record<string, unknown> | undefined
  ) => boolean | undefined;
  mapPassResultDelivery: (input: {
    deliveryResult: DeliveryAck | undefined;
    deliveryRetried: boolean;
  }) => {
    status: "accepted" | "rejected";
    delivered?: boolean;
    reason?: string;
    reason_code?: string;
    retried: boolean;
  } | undefined;
  buildNormalPassResult: (input: {
    bubbleId: string;
    sequence: number;
    envelope: ProtocolEnvelope;
    state: BubbleStateSnapshot;
    inferredIntent: boolean;
    activation?: PassActivationProvenance;
    repeatCleanReasonCode: RepeatCleanAutoconvergeReasonCode;
    repeatCleanReasonDetail: RepeatCleanAutoconvergeReasonDetail;
    repeatCleanTrigger: boolean;
    mostRecentPreviousReviewerCleanPassEnvelope: boolean;
    delivery?: {
      status: "accepted" | "rejected";
      delivered?: boolean;
      reason?: string;
      reason_code?: string;
      retried: boolean;
    };
    passValidationCompatibilityArtifactWriteFailureReason?: string;
    docGateArtifactWriteFailureReason?: string;
  }) => TResult;
}

export async function finalizeNormalPass<TResult>(
  input: FinalizeNormalPassInput,
  dependencies: FinalizeNormalPassDependencies<TResult>
): Promise<TResult> {
  await dependencies.emitBubbleLifecycleEventBestEffort({
    repoPath: input.repoPath,
    bubbleId: input.bubbleId,
    bubbleInstanceId: input.bubbleInstanceId,
    eventType: "bubble_passed",
    round: input.round,
    actorRole: input.actorRole,
    metadata: dependencies.buildPassLifecycleMetricMetadata({
      passIntent: input.passIntent,
      inferredIntent: input.inferredIntent,
      sender: input.sender,
      recipient: input.recipient,
      recipientRole: input.recipientRole,
      refsCount: input.refsCount,
      hasFindings: input.hasFindings,
      noFindings: input.noFindings,
      ...(input.reviewerFindingsClaim !== undefined
        ? { reviewerFindingsClaim: input.reviewerFindingsClaim }
        : {}),
      ...(input.reviewerFindingsClaimParserMetadata !== undefined
        ? { reviewerFindingsClaimParserMetadata: input.reviewerFindingsClaimParserMetadata }
        : {}),
      transitionDecision: "normal_pass",
      repeatCleanReasonCode: input.repeatCleanReasonCode,
      repeatCleanReasonDetail: input.repeatCleanReasonDetail,
      repeatCleanTrigger: input.repeatCleanTrigger,
      mostRecentPreviousReviewerCleanPassEnvelope:
        input.fallbackMostRecentPreviousReviewerCleanPassEnvelope,
      ...(input.reviewerTestDirective !== undefined
        ? { reviewerTestDirective: input.reviewerTestDirective }
        : {}),
      ...(input.passValidationCompatibilityArtifactWriteFailureReason !== undefined
        ? {
            passValidationCompatibilityArtifactWriteFailureReason:
              input.passValidationCompatibilityArtifactWriteFailureReason
          }
        : {}),
      findings: input.findings,
      ...(input.docGateArtifactWriteFailureReason !== undefined
        ? { docGateArtifactWriteFailureReason: input.docGateArtifactWriteFailureReason }
        : {})
    }),
    now: input.now
  });

  const mostRecentPreviousReviewerCleanPassEnvelope =
    dependencies.resolveMostRecentPreviousReviewerPassIsCleanFromMetadata(
      input.envelope.payload.metadata
    ) ?? input.fallbackMostRecentPreviousReviewerCleanPassEnvelope;

  const deliveryForResult = dependencies.mapPassResultDelivery({
    deliveryResult: input.deliveryResult,
    deliveryRetried: input.deliveryRetried
  });

  return dependencies.buildNormalPassResult({
    bubbleId: input.bubbleId,
    sequence: input.sequence,
    envelope: input.envelope,
    state: input.state,
    inferredIntent: input.inferredIntent,
    ...(input.activation !== undefined
      ? { activation: input.activation }
      : {}),
    repeatCleanReasonCode: input.repeatCleanReasonCode,
    repeatCleanReasonDetail: input.repeatCleanReasonDetail,
    repeatCleanTrigger: input.repeatCleanTrigger,
    mostRecentPreviousReviewerCleanPassEnvelope,
    ...(deliveryForResult !== undefined
      ? { delivery: deliveryForResult }
      : {}),
    ...(input.passValidationCompatibilityArtifactWriteFailureReason !== undefined
      ? {
          passValidationCompatibilityArtifactWriteFailureReason:
            input.passValidationCompatibilityArtifactWriteFailureReason
        }
      : {}),
    ...(input.docGateArtifactWriteFailureReason !== undefined
      ? { docGateArtifactWriteFailureReason: input.docGateArtifactWriteFailureReason }
      : {})
  });
}
