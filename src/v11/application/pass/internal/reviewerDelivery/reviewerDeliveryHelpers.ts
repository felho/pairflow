import type {
  DeliveryAck,
  EmitDeliveryNotificationInput
} from "../../../../ports/tmuxDelivery.js";
import {
  formatReviewerBriefPrompt,
  formatReviewerFocusBridgeBlock,
  type ReviewerFocusExtractionResult
} from "../../../../shared/reviewer/reviewerBrief.js";
import type { RefreshReviewerContextPort } from "../../../../ports/reviewerContext.js";
import type {
  ReadReviewerBriefArtifactPort,
  ReadReviewerFocusArtifactPort
} from "../../../../ports/reviewerArtifacts.js";
import type {
  ResolveDeliveryMessageRefPort
} from "../../../../ports/tmuxDelivery.js";
import type { BubbleConfig } from "../../../../shared/config/bubbleConfigTypes.js";
import type { ProtocolEnvelope } from "../../../../shared/protocol/protocolEnvelopeContract.js";
import type { ReviewerTestExecutionDirective } from "../../../../shared/reviewer/testEvidence.js";
import type { PassRecipientRole, PassSenderRole } from "../../../../domain/pass/handoff.js";

export async function loadReviewerStartupPrompt(input: {
  reviewerBriefArtifactPath: string;
  reviewerFocusArtifactPath: string;
  readReviewerBriefArtifact: ReadReviewerBriefArtifactPort;
  readReviewerFocusArtifact: ReadReviewerFocusArtifactPort;
}): Promise<{
  reviewerBriefText: string | undefined;
  reviewerFocus: Awaited<ReturnType<ReadReviewerFocusArtifactPort>> | undefined;
  reviewerStartupPrompt: string | undefined;
}> {
  const reviewerBriefText = await input.readReviewerBriefArtifact(
    input.reviewerBriefArtifactPath
  ).catch(() => undefined);
  const reviewerFocus = await input.readReviewerFocusArtifact(
    input.reviewerFocusArtifactPath
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
  return {
    reviewerBriefText,
    reviewerFocus,
    reviewerStartupPrompt:
      reviewerStartupContextBlocks.length > 0
        ? reviewerStartupContextBlocks.join("\n\n")
        : undefined
  };
}

function shouldRefreshReviewerContext(input: {
  senderRole: PassSenderRole;
  bubbleConfig: BubbleConfig;
}): boolean {
  return (
    input.senderRole === "implementer"
    && input.bubbleConfig.reviewer_context_mode === "fresh"
  );
}

export async function resolveDeliveryInitialDelayMs(input: {
  executeInput: {
    senderRole: PassSenderRole;
    bubbleId: string;
    bubbleConfig: BubbleConfig;
    sessionsPath: string;
  };
  reviewerStartupPrompt: string | undefined;
  refreshReviewer: RefreshReviewerContextPort;
}): Promise<number | undefined> {
  if (!shouldRefreshReviewerContext(input.executeInput)) {
    return undefined;
  }

  // Best effort only; protocol/state progression must not fail if tmux refresh fails.
  const refreshResult = await input.refreshReviewer({
    bubbleId: input.executeInput.bubbleId,
    bubbleConfig: input.executeInput.bubbleConfig,
    sessionsPath: input.executeInput.sessionsPath,
    ...(input.reviewerStartupPrompt !== undefined
      ? { reviewerStartupPrompt: input.reviewerStartupPrompt }
      : {})
  }).catch(() => undefined);
  if (refreshResult?.refreshed === true) {
    // Give the respawned reviewer CLI a short warm-up before delivery injection.
    return 1500;
  }
  return undefined;
}

export function buildPassDeliveryInput(input: {
  executeInput: {
    bubbleId: string;
    bubbleConfig: BubbleConfig;
    sessionsPath: string;
    envelope: ProtocolEnvelope;
    senderRole: "implementer" | "reviewer";
    recipientRole: PassRecipientRole;
    reviewerTestDirective?: ReviewerTestExecutionDirective;
  };
  reviewerBriefText: string | undefined;
  reviewerFocus: Awaited<ReturnType<ReadReviewerFocusArtifactPort>> | undefined;
  initialDelayMs: number | undefined;
  resolveDeliveryMessageRef: ResolveDeliveryMessageRefPort;
}): EmitDeliveryNotificationInput {
  const reviewerFocusForDelivery: ReviewerFocusExtractionResult | undefined = (
    input.executeInput.senderRole === "implementer"
    && input.reviewerFocus?.status === "present"
  )
    ? input.reviewerFocus
    : undefined;

  return {
    bubbleId: input.executeInput.bubbleId,
    bubbleConfig: input.executeInput.bubbleConfig,
    sessionsPath: input.executeInput.sessionsPath,
    envelope: input.executeInput.envelope,
    recipientRole: input.executeInput.recipientRole,
    messageRef: input.resolveDeliveryMessageRef({
      bubbleId: input.executeInput.bubbleId,
      sessionsPath: input.executeInput.sessionsPath,
      envelope: input.executeInput.envelope
    }),
    ...(input.executeInput.reviewerTestDirective !== undefined
      ? { reviewerTestDirective: input.executeInput.reviewerTestDirective }
      : {}),
    ...(input.reviewerBriefText !== undefined
      ? { reviewerBrief: input.reviewerBriefText }
      : {}),
    ...(reviewerFocusForDelivery !== undefined
      ? { reviewerFocus: reviewerFocusForDelivery }
      : {}),
    ...(input.initialDelayMs !== undefined ? { initialDelayMs: input.initialDelayMs } : {})
  };
}

export function shouldRetryPassDelivery(input: {
  executeInput: {
    senderRole: PassSenderRole;
    recipientRole: PassRecipientRole;
  };
  deliveryResult: DeliveryAck | undefined;
}): boolean {
  return (
    input.executeInput.senderRole === "implementer"
    && input.executeInput.recipientRole === "reviewer"
    && (
      input.deliveryResult?.reason === "no_runtime_session"
      || 
      input.deliveryResult?.reason === "delivery_unconfirmed"
      || input.deliveryResult?.reason === "command_failed"
    )
  );
}
