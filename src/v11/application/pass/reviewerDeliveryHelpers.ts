import {
  resolveDeliveryMessageRef,
  type EmitTmuxDeliveryNotificationInput,
  type EmitTmuxDeliveryNotificationResult
} from "../../infrastructure/channel/tmux/tmuxDelivery.js";
import {
  formatReviewerBriefPrompt,
  formatReviewerFocusBridgeBlock,
  readReviewerBriefArtifact,
  readReviewerFocusArtifact,
  type ReviewerFocusExtractionResult
} from "../../../core/reviewer/reviewerBrief.js";
import { type refreshReviewerContext } from "../../infrastructure/channel/tmux/reviewerContext.js";
import type { BubbleConfig } from "../../../types/bubble.js";
import type { ProtocolEnvelope } from "../../../types/protocol.js";
import type { ReviewerTestExecutionDirective } from "../../../core/reviewer/testEvidence.js";

export async function loadReviewerStartupPrompt(input: {
  reviewerBriefArtifactPath: string;
  reviewerFocusArtifactPath: string;
}): Promise<{
  reviewerBriefText: string | undefined;
  reviewerFocus: Awaited<ReturnType<typeof readReviewerFocusArtifact>> | undefined;
  reviewerStartupPrompt: string | undefined;
}> {
  const reviewerBriefText = await readReviewerBriefArtifact(
    input.reviewerBriefArtifactPath
  ).catch(() => undefined);
  const reviewerFocus = await readReviewerFocusArtifact(
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
  senderRole: "implementer" | "reviewer";
  bubbleConfig: BubbleConfig;
}): boolean {
  return (
    input.senderRole === "implementer"
    && input.bubbleConfig.reviewer_context_mode === "fresh"
  );
}

export async function resolveDeliveryInitialDelayMs(input: {
  executeInput: {
    senderRole: "implementer" | "reviewer";
    bubbleId: string;
    bubbleConfig: BubbleConfig;
    sessionsPath: string;
  };
  reviewerStartupPrompt: string | undefined;
  refreshReviewer: typeof refreshReviewerContext;
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
    reviewerTestDirective?: ReviewerTestExecutionDirective;
  };
  reviewerBriefText: string | undefined;
  reviewerFocus: Awaited<ReturnType<typeof readReviewerFocusArtifact>> | undefined;
  initialDelayMs: number | undefined;
}): EmitTmuxDeliveryNotificationInput {
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
    messageRef: resolveDeliveryMessageRef({
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
    senderRole: "implementer" | "reviewer";
    recipientRole: "implementer" | "reviewer";
  };
  deliveryResult: EmitTmuxDeliveryNotificationResult | undefined;
}): boolean {
  return (
    input.executeInput.senderRole === "implementer"
    && input.executeInput.recipientRole === "reviewer"
    && (
      input.deliveryResult?.reason === "delivery_unconfirmed"
      || input.deliveryResult?.reason === "tmux_send_failed"
    )
  );
}
