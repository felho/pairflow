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

async function loadReviewerStartupPrompt(input: {
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

function shouldRefreshReviewerContext(input: ExecutePassDeliveryInput): boolean {
  return (
    input.senderRole === "implementer"
    && input.bubbleConfig.reviewer_context_mode === "fresh"
  );
}

async function resolveDeliveryInitialDelayMs(input: {
  executeInput: ExecutePassDeliveryInput;
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

function buildPassDeliveryInput(input: {
  executeInput: ExecutePassDeliveryInput;
  reviewerBriefText: string | undefined;
  reviewerFocus: Awaited<ReturnType<typeof readReviewerFocusArtifact>> | undefined;
  initialDelayMs: number | undefined;
}) {
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
    ...(
      input.executeInput.senderRole === "implementer"
      && input.reviewerFocus?.status === "present"
        ? { reviewerFocus: input.reviewerFocus }
        : {}
    ),
    ...(input.initialDelayMs !== undefined ? { initialDelayMs: input.initialDelayMs } : {})
  };
}

function shouldRetryPassDelivery(input: {
  executeInput: ExecutePassDeliveryInput;
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

export async function executePassDelivery(
  input: ExecutePassDeliveryInput,
  dependencies: PassDeliveryDependencies = {}
): Promise<ExecutePassDeliveryResult> {
  const {
    reviewerBriefText,
    reviewerFocus,
    reviewerStartupPrompt
  } = await loadReviewerStartupPrompt({
    reviewerBriefArtifactPath: input.reviewerBriefArtifactPath,
    reviewerFocusArtifactPath: input.reviewerFocusArtifactPath
  });

  const refreshReviewer =
    dependencies.refreshReviewerContext ?? refreshReviewerContext;
  const deliveryInitialDelayMs = await resolveDeliveryInitialDelayMs({
    executeInput: input,
    reviewerStartupPrompt,
    refreshReviewer
  });

  const emitDelivery =
    dependencies.emitTmuxDeliveryNotification ?? emitTmuxDeliveryNotification;
  const deliveryInput = buildPassDeliveryInput({
    executeInput: input,
    reviewerBriefText,
    reviewerFocus,
    initialDelayMs: deliveryInitialDelayMs
  });
  let deliveryResult = await emitDelivery(deliveryInput).catch(() => undefined);
  let deliveryRetried = false;
  const shouldRetryDelivery = shouldRetryPassDelivery({
    executeInput: input,
    deliveryResult
  });
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
