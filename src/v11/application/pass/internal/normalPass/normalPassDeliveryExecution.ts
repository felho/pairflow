import type { BubbleConfig } from "../../../../shared/config/bubbleConfigTypes.js";
import type { ProtocolEnvelope } from "../../../../../types/protocol.js";
import type { ReviewerTestExecutionDirective } from "../../../../shared/reviewer/testEvidence.js";
import type { PassRecipientRole, PassSenderRole } from "../../../../domain/pass/handoff.js";
import type {
  ReadReviewerBriefArtifactPort,
  ReadReviewerFocusArtifactPort
} from "../../../../ports/reviewerArtifacts.js";
import type {
  ResolveReviewerTestExecutionDirectiveFromArtifactPort,
  VerifyImplementerTestEvidencePort,
  WriteReviewerTestEvidenceArtifactPort
} from "../../../../ports/reviewerTestEvidenceArtifacts.js";
import type {
  DeliveryAck,
  EmitDeliveryNotificationAckPort
} from "../../../../ports/tmuxDelivery.js";
import type {
  ResolveDeliveryMessageRefPort
} from "../../../../ports/tmuxDelivery.js";
import type { RefreshReviewerContextPort } from "../../../../ports/reviewerContext.js";

export interface ExecuteNormalPassDeliveryInput {
  senderRole: PassSenderRole;
  bubbleId: string;
  bubbleConfig: BubbleConfig;
  envelope: ProtocolEnvelope;
  worktreePath: string;
  repoPath: string;
  artifactsDir: string;
  sessionsPath: string;
  reviewerBriefArtifactPath: string;
  reviewerFocusArtifactPath: string;
  recipientRole: PassRecipientRole;
  now: Date;
  reviewerTestDirective?: ReviewerTestExecutionDirective;
}

export interface ExecuteNormalPassDeliveryDependencies {
  resolveReviewerTestDirectiveForPass: (input: {
    senderRole: "implementer" | "reviewer";
    bubbleId: string;
    bubbleConfig: BubbleConfig;
    envelope: ProtocolEnvelope;
    worktreePath: string;
    repoPath: string;
    artifactsDir: string;
    now: Date;
  }, dependencies?: {
    verifyImplementerTestEvidence?: VerifyImplementerTestEvidencePort;
    writeReviewerTestEvidenceArtifact?: WriteReviewerTestEvidenceArtifactPort;
    resolveReviewerTestExecutionDirectiveFromArtifact?:
      ResolveReviewerTestExecutionDirectiveFromArtifactPort;
  }) => Promise<ReviewerTestExecutionDirective | undefined>;
  executePassDelivery: (
    input: {
      bubbleId: string;
      bubbleConfig: BubbleConfig;
      sessionsPath: string;
      reviewerBriefArtifactPath: string;
      reviewerFocusArtifactPath: string;
      envelope: ProtocolEnvelope;
      senderRole: PassSenderRole;
      recipientRole: PassRecipientRole;
      reviewerTestDirective?: ReviewerTestExecutionDirective;
    },
    dependencies?: {
      emitDeliveryNotificationAck?: EmitDeliveryNotificationAckPort;
      refreshReviewerContext?: RefreshReviewerContextPort;
      readReviewerBriefArtifact?: ReadReviewerBriefArtifactPort;
      readReviewerFocusArtifact?: ReadReviewerFocusArtifactPort;
      resolveDeliveryMessageRef?: ResolveDeliveryMessageRefPort;
    }
  ) => Promise<{
    result: DeliveryAck | undefined;
    retried: boolean;
  }>;
  verifyImplementerTestEvidence?: VerifyImplementerTestEvidencePort;
  writeReviewerTestEvidenceArtifact?: WriteReviewerTestEvidenceArtifactPort;
  resolveReviewerTestExecutionDirectiveFromArtifact?:
    ResolveReviewerTestExecutionDirectiveFromArtifactPort;
  emitDeliveryNotificationAck?: EmitDeliveryNotificationAckPort;
  refreshReviewerContext?: RefreshReviewerContextPort;
  readReviewerBriefArtifact?: ReadReviewerBriefArtifactPort;
  readReviewerFocusArtifact?: ReadReviewerFocusArtifactPort;
  resolveDeliveryMessageRef?: ResolveDeliveryMessageRefPort;
}

export interface ExecuteNormalPassDeliveryResult {
  reviewerTestDirective?: ReviewerTestExecutionDirective;
  deliveryResult: DeliveryAck | undefined;
  deliveryRetried: boolean;
}

function resolveNormalPassDeliveryOverride(
  dependencies: ExecuteNormalPassDeliveryDependencies
): EmitDeliveryNotificationAckPort | undefined {
  return dependencies.emitDeliveryNotificationAck;
}

export async function executeNormalPassDelivery(
  input: ExecuteNormalPassDeliveryInput,
  dependencies: ExecuteNormalPassDeliveryDependencies
): Promise<ExecuteNormalPassDeliveryResult> {
  const emitDeliveryNotificationAck =
    resolveNormalPassDeliveryOverride(dependencies);
  const reviewerTestDirective =
    input.reviewerTestDirective
    ?? await dependencies.resolveReviewerTestDirectiveForPass({
      senderRole: input.senderRole,
      bubbleId: input.bubbleId,
      bubbleConfig: input.bubbleConfig,
      envelope: input.envelope,
      worktreePath: input.worktreePath,
      repoPath: input.repoPath,
      artifactsDir: input.artifactsDir,
      now: input.now
    }, {
      ...(dependencies.verifyImplementerTestEvidence !== undefined
        ? {
            verifyImplementerTestEvidence:
              dependencies.verifyImplementerTestEvidence
          }
        : {}),
      ...(dependencies.writeReviewerTestEvidenceArtifact !== undefined
        ? {
            writeReviewerTestEvidenceArtifact:
              dependencies.writeReviewerTestEvidenceArtifact
          }
        : {}),
      ...(dependencies.resolveReviewerTestExecutionDirectiveFromArtifact !== undefined
        ? {
            resolveReviewerTestExecutionDirectiveFromArtifact:
              dependencies.resolveReviewerTestExecutionDirectiveFromArtifact
          }
        : {})
    });

  const delivery = await dependencies.executePassDelivery(
    {
      bubbleId: input.bubbleId,
      bubbleConfig: input.bubbleConfig,
      sessionsPath: input.sessionsPath,
      reviewerBriefArtifactPath: input.reviewerBriefArtifactPath,
      reviewerFocusArtifactPath: input.reviewerFocusArtifactPath,
      envelope: input.envelope,
      senderRole: input.senderRole,
      recipientRole: input.recipientRole,
      ...(reviewerTestDirective !== undefined
        ? { reviewerTestDirective }
        : {})
    },
    {
      ...(emitDeliveryNotificationAck !== undefined
        ? { emitDeliveryNotificationAck }
        : {}),
      ...(dependencies.refreshReviewerContext !== undefined
        ? { refreshReviewerContext: dependencies.refreshReviewerContext }
        : {}),
      ...(dependencies.readReviewerBriefArtifact !== undefined
        ? { readReviewerBriefArtifact: dependencies.readReviewerBriefArtifact }
        : {}),
      ...(dependencies.readReviewerFocusArtifact !== undefined
        ? { readReviewerFocusArtifact: dependencies.readReviewerFocusArtifact }
        : {}),
      ...(dependencies.resolveDeliveryMessageRef !== undefined
        ? { resolveDeliveryMessageRef: dependencies.resolveDeliveryMessageRef }
        : {})
    }
  );

  return {
    ...(reviewerTestDirective !== undefined
      ? { reviewerTestDirective }
      : {}),
    deliveryResult:
      delivery.result === undefined
        ? undefined
        : delivery.result,
    deliveryRetried: delivery.retried
  };
}
