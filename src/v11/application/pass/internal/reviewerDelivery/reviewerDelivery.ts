import {
  type DeliveryAck,
  type EmitDeliveryNotificationAckPort
} from "../../../../ports/tmuxDelivery.js";
import type { ReviewerTestExecutionDirective } from "../../../../shared/reviewer/testEvidence.js";
import type { BubbleConfig } from "../../../../shared/config/bubbleConfigTypes.js";
import type { ProtocolEnvelope } from "../../../../shared/protocol/protocolEnvelopeContract.js";
import type {
  ReadReviewerBriefArtifactPort,
  ReadReviewerFocusArtifactPort
} from "../../../../ports/reviewerArtifacts.js";
import type {
  ResolveDeliveryMessageRefPort
} from "../../../../ports/tmuxDelivery.js";
import type { RefreshReviewerContextPort } from "../../../../ports/reviewerContext.js";
import type {
  ResolveReviewerTestExecutionDirectiveFromArtifactPort,
  VerifyImplementerTestEvidencePort,
  WriteReviewerTestEvidenceArtifactPort
} from "../../../../ports/reviewerTestEvidenceArtifacts.js";
import type { PassRecipientRole, PassSenderRole } from "../../../../domain/pass/handoff.js";
import {
  buildPassDeliveryInput,
  loadReviewerStartupPrompt,
  resolveDeliveryInitialDelayMs,
  shouldRetryPassDelivery
} from "./reviewerDeliveryHelpers.js";
import { executeImplementerHandoffDelivery } from "../../../../shared/delivery/implementerHandoffDelivery.js";
import {
  reviewerDeliveryDefaults
} from "../../reviewerDeliveryDefaults.js";

export interface PassDeliveryDependencies {
  emitDeliveryNotificationAck?: EmitDeliveryNotificationAckPort;
  refreshReviewerContext?: RefreshReviewerContextPort;
  readReviewerBriefArtifact?: ReadReviewerBriefArtifactPort;
  readReviewerFocusArtifact?: ReadReviewerFocusArtifactPort;
  resolveDeliveryMessageRef?: ResolveDeliveryMessageRefPort;
  verifyImplementerTestEvidence?: VerifyImplementerTestEvidencePort;
  writeReviewerTestEvidenceArtifact?: WriteReviewerTestEvidenceArtifactPort;
  resolveReviewerTestExecutionDirectiveFromArtifact?:
    ResolveReviewerTestExecutionDirectiveFromArtifactPort;
}

export interface ExecutePassDeliveryInput {
  bubbleId: string;
  bubbleConfig: BubbleConfig;
  sessionsPath: string;
  reviewerBriefArtifactPath: string;
  reviewerFocusArtifactPath: string;
  envelope: ProtocolEnvelope;
  senderRole: PassSenderRole;
  recipientRole: PassRecipientRole;
  reviewerTestDirective?: ReviewerTestExecutionDirective;
}

export interface ExecutePassDeliveryResult {
  result: DeliveryAck | undefined;
  retried: boolean;
}

export async function executePassDelivery(
  input: ExecutePassDeliveryInput,
  dependencies: PassDeliveryDependencies = {}
): Promise<ExecutePassDeliveryResult> {
  const emitDelivery =
    dependencies.emitDeliveryNotificationAck
    ?? reviewerDeliveryDefaults.emitDeliveryNotificationAck;
  const resolveMessageRef =
    dependencies.resolveDeliveryMessageRef
    ?? reviewerDeliveryDefaults.resolveDeliveryMessageRef;
  if (input.recipientRole !== "reviewer") {
    const deliveryInput = buildPassDeliveryInput({
      executeInput: input,
      reviewerBriefText: undefined,
      reviewerFocus: undefined,
      initialDelayMs: undefined,
      resolveDeliveryMessageRef: resolveMessageRef
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
    reviewerFocusArtifactPath: input.reviewerFocusArtifactPath,
    readReviewerBriefArtifact:
      dependencies.readReviewerBriefArtifact
      ?? reviewerDeliveryDefaults.readReviewerBriefArtifact,
    readReviewerFocusArtifact:
      dependencies.readReviewerFocusArtifact
      ?? reviewerDeliveryDefaults.readReviewerFocusArtifact
  });

  const refreshReviewer =
    dependencies.refreshReviewerContext
    ?? reviewerDeliveryDefaults.refreshReviewerContext;
  const deliveryInitialDelayMs = await resolveDeliveryInitialDelayMs({
    executeInput: input,
    reviewerStartupPrompt,
    refreshReviewer
  });

  const deliveryInput = buildPassDeliveryInput({
    executeInput: input,
    reviewerBriefText,
    reviewerFocus,
    initialDelayMs: deliveryInitialDelayMs,
    resolveDeliveryMessageRef: resolveMessageRef
  });
  let deliveryResult = await emitDelivery(deliveryInput)
    .catch(() => undefined);
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
