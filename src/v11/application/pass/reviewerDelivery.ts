import {
  emitTmuxDeliveryNotification as defaultEmitTmuxDeliveryNotification,
  type EmitTmuxDeliveryNotificationResult
} from "../../../core/runtime/tmuxDelivery.js";
import {
  refreshReviewerContext as defaultRefreshReviewerContext
} from "../../../core/runtime/reviewerContext.js";
import type { ReviewerTestExecutionDirective } from "../../../v11/shared/reviewer/testEvidence.js";
import type { BubbleConfig } from "../../../types/bubble.js";
import type { ProtocolEnvelope } from "../../../types/protocol.js";
import type {
  EmitTmuxDeliveryNotificationPort
} from "../../../v11/shared/ports/tmuxDelivery.js";
import type { RefreshReviewerContextPort } from "../../../v11/shared/ports/reviewerContext.js";
import {
  buildPassDeliveryInput,
  loadReviewerStartupPrompt,
  resolveDeliveryInitialDelayMs,
  shouldRetryPassDelivery
} from "./reviewerDeliveryHelpers.js";
import { executeImplementerHandoffDelivery } from "../../shared/delivery/implementerHandoffDelivery.js";

export interface PassDeliveryDependencies {
  emitTmuxDeliveryNotification?: EmitTmuxDeliveryNotificationPort;
  refreshReviewerContext?: RefreshReviewerContextPort;
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
  const emitDelivery =
    dependencies.emitTmuxDeliveryNotification
    ?? defaultEmitTmuxDeliveryNotification;
  if (input.recipientRole === "implementer") {
    const deliveryInput = buildPassDeliveryInput({
      executeInput: input,
      reviewerBriefText: undefined,
      reviewerFocus: undefined,
      initialDelayMs: undefined
    });
    return executeImplementerHandoffDelivery({
      deliveryInput,
      emitDelivery
    });
  }

  const {
    reviewerBriefText,
    reviewerFocus,
    reviewerStartupPrompt
  } = await loadReviewerStartupPrompt({
    reviewerBriefArtifactPath: input.reviewerBriefArtifactPath,
    reviewerFocusArtifactPath: input.reviewerFocusArtifactPath
  });

  const refreshReviewer =
    dependencies.refreshReviewerContext ?? defaultRefreshReviewerContext;
  const deliveryInitialDelayMs = await resolveDeliveryInitialDelayMs({
    executeInput: input,
    reviewerStartupPrompt,
    refreshReviewer
  });

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
