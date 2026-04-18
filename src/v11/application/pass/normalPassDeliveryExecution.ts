import type { BubbleConfig } from "../../../types/bubble.js";
import type { ProtocolEnvelope } from "../../../types/protocol.js";
import type { ReviewerTestExecutionDirective } from "../../../v11/shared/reviewer/testEvidence.js";
import type {
  ReadReviewerBriefArtifactPort,
  ReadReviewerFocusArtifactPort
} from "../../../v11/shared/ports/reviewerArtifacts.js";
import type {
  ResolveReviewerTestExecutionDirectiveFromArtifactPort,
  VerifyImplementerTestEvidencePort,
  WriteReviewerTestEvidenceArtifactPort
} from "../../../v11/shared/ports/reviewerTestEvidenceArtifacts.js";
import type {
  DeliveryAck,
  DeliveryAckLike,
  EmitDeliveryAckLikePort
} from "../../../v11/shared/ports/tmuxDelivery.js";
import type {
  ResolveDeliveryMessageRefPort
} from "../../../v11/shared/ports/tmuxDelivery.js";
import type { RefreshReviewerContextPort } from "../../../v11/shared/ports/reviewerContext.js";
import { normalizeDeliveryAck } from "../../../v11/shared/delivery/deliveryAckNormalization.js";

export interface ExecuteNormalPassDeliveryInput {
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
      senderRole: "implementer" | "reviewer";
      recipientRole: "implementer" | "reviewer";
      reviewerTestDirective?: ReviewerTestExecutionDirective;
    },
    dependencies?: {
      emitDeliveryNotificationAck?: EmitDeliveryAckLikePort;
      emitTmuxDeliveryNotification?: EmitDeliveryAckLikePort;
      refreshReviewerContext?: RefreshReviewerContextPort;
      readReviewerBriefArtifact?: ReadReviewerBriefArtifactPort;
      readReviewerFocusArtifact?: ReadReviewerFocusArtifactPort;
      resolveDeliveryMessageRef?: ResolveDeliveryMessageRefPort;
    }
  ) => Promise<{
    result: DeliveryAckLike | undefined;
    retried: boolean;
  }>;
  verifyImplementerTestEvidence?: VerifyImplementerTestEvidencePort;
  writeReviewerTestEvidenceArtifact?: WriteReviewerTestEvidenceArtifactPort;
  resolveReviewerTestExecutionDirectiveFromArtifact?:
    ResolveReviewerTestExecutionDirectiveFromArtifactPort;
  emitDeliveryNotificationAck?: EmitDeliveryAckLikePort;
  emitTmuxDeliveryNotification?: EmitDeliveryAckLikePort;
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

export async function executeNormalPassDelivery(
  input: ExecuteNormalPassDeliveryInput,
  dependencies: ExecuteNormalPassDeliveryDependencies
): Promise<ExecuteNormalPassDeliveryResult> {
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
      ...(dependencies.emitDeliveryNotificationAck !== undefined
        ? { emitDeliveryNotificationAck: dependencies.emitDeliveryNotificationAck }
        : {}),
      ...(dependencies.emitTmuxDeliveryNotification !== undefined
        ? { emitTmuxDeliveryNotification: dependencies.emitTmuxDeliveryNotification }
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
        : normalizeDeliveryAck(delivery.result),
    deliveryRetried: delivery.retried
  };
}
