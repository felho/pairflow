import type { BubbleConfig } from "../../../types/bubble.js";
import type { ProtocolEnvelope } from "../../../types/protocol.js";
import type { ReviewerTestExecutionDirective } from "../../../v11/shared/reviewer/testEvidence.js";
import type {
  EmitTmuxDeliveryNotificationPort,
  EmitTmuxDeliveryNotificationResult
} from "../../../v11/shared/ports/tmuxDelivery.js";
import type { RefreshReviewerContextPort } from "../../../v11/shared/ports/reviewerContext.js";

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
      emitTmuxDeliveryNotification?: EmitTmuxDeliveryNotificationPort;
      refreshReviewerContext?: RefreshReviewerContextPort;
    }
  ) => Promise<{
    result: EmitTmuxDeliveryNotificationResult | undefined;
    retried: boolean;
  }>;
  emitTmuxDeliveryNotification?: EmitTmuxDeliveryNotificationPort;
  refreshReviewerContext?: RefreshReviewerContextPort;
}

export interface ExecuteNormalPassDeliveryResult {
  reviewerTestDirective?: ReviewerTestExecutionDirective;
  deliveryResult: EmitTmuxDeliveryNotificationResult | undefined;
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
      ...(dependencies.emitTmuxDeliveryNotification !== undefined
        ? { emitTmuxDeliveryNotification: dependencies.emitTmuxDeliveryNotification }
        : {}),
      ...(dependencies.refreshReviewerContext !== undefined
        ? { refreshReviewerContext: dependencies.refreshReviewerContext }
        : {})
    }
  );

  return {
    ...(reviewerTestDirective !== undefined
      ? { reviewerTestDirective }
      : {}),
    deliveryResult: delivery.result,
    deliveryRetried: delivery.retried
  };
}
