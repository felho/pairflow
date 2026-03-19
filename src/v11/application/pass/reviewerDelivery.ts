import {
  emitTmuxDeliveryNotification,
  resolveDeliveryMessageRef,
  type EmitTmuxDeliveryNotificationResult
} from "../../../core/runtime/tmuxDelivery.js";
import {
  formatReviewerBriefPrompt,
  formatReviewerFocusBridgeBlock,
  readReviewerBriefArtifact,
  readReviewerFocusArtifact
} from "../../../core/reviewer/reviewerBrief.js";
import { refreshReviewerContext } from "../../../core/runtime/reviewerContext.js";
import type { ReviewerTestExecutionDirective } from "../../../core/reviewer/testEvidence.js";
import type { BubbleConfig } from "../../../types/bubble.js";
import type { ProtocolEnvelope } from "../../../types/protocol.js";

export interface PassDeliveryDependencies {
  emitTmuxDeliveryNotification?: typeof emitTmuxDeliveryNotification;
  refreshReviewerContext?: typeof refreshReviewerContext;
}

export interface ExecutePassDeliveryInput {
  bubbleId: string;
  bubbleConfig: BubbleConfig;
  sessionsPath: string;
  reviewerBriefArtifactPath: string;
  reviewerFocusArtifactPath: string;
  envelope: ProtocolEnvelope;
  senderRole: "implementer" | "reviewer";
  recipientRole: "implementer" | "reviewer";
  reviewerTestDirective?: ReviewerTestExecutionDirective;
}

export interface ExecutePassDeliveryResult {
  result: EmitTmuxDeliveryNotificationResult | undefined;
  retried: boolean;
}

export async function executePassDelivery(
  input: ExecutePassDeliveryInput,
  dependencies: PassDeliveryDependencies = {}
): Promise<ExecutePassDeliveryResult> {
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
  const reviewerStartupPrompt =
    reviewerStartupContextBlocks.length > 0
      ? reviewerStartupContextBlocks.join("\n\n")
      : undefined;

  const refreshReviewer =
    dependencies.refreshReviewerContext ?? refreshReviewerContext;
  let deliveryInitialDelayMs: number | undefined;
  if (
    input.senderRole === "implementer"
    && input.bubbleConfig.reviewer_context_mode === "fresh"
  ) {
    // Best effort only; protocol/state progression must not fail if tmux refresh fails.
    const refreshResult = await refreshReviewer({
      bubbleId: input.bubbleId,
      bubbleConfig: input.bubbleConfig,
      sessionsPath: input.sessionsPath,
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
    bubbleId: input.bubbleId,
    bubbleConfig: input.bubbleConfig,
    sessionsPath: input.sessionsPath,
    envelope: input.envelope,
    messageRef: resolveDeliveryMessageRef({
      bubbleId: input.bubbleId,
      sessionsPath: input.sessionsPath,
      envelope: input.envelope
    }),
    ...(input.reviewerTestDirective !== undefined
      ? { reviewerTestDirective: input.reviewerTestDirective }
      : {}),
    ...(reviewerBriefText !== undefined ? { reviewerBrief: reviewerBriefText } : {}),
    ...(
      input.senderRole === "implementer" &&
      reviewerFocus?.status === "present"
        ? { reviewerFocus }
        : {}
    ),
    ...(deliveryInitialDelayMs !== undefined ? { initialDelayMs: deliveryInitialDelayMs } : {})
  };
  let deliveryResult = await emitDelivery(deliveryInput).catch(() => undefined);
  let deliveryRetried = false;
  const shouldRetryDelivery =
    input.senderRole === "implementer"
    && input.recipientRole === "reviewer"
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

  return {
    result: deliveryResult,
    retried: deliveryRetried
  };
}
