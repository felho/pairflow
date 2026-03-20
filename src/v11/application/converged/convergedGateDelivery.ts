import type {
  emitTmuxDeliveryNotification,
  resolveDeliveryMessageRef,
  EmitTmuxDeliveryNotificationResult
} from "../../../core/runtime/tmuxDelivery.js";
import type { applyMetaReviewGateOnConvergence } from "../../shared/metaReviewGate/metaReviewGateCommandApi.js";
import type { ResolvedBubbleWorkspace } from "../../../core/bubble/workspaceResolution.js";
import type { AgentName } from "../../../types/bubble.js";
import {
  deliveryTargetRoleMetadataKey,
  type DeliveryTargetRole,
  type ProtocolEnvelope
} from "../../../types/protocol.js";

export interface ConvergedDeliveryResult {
  delivered: boolean;
  reason?: string;
  retried: boolean;
}

function withDeliveryTargetRole(
  envelope: ProtocolEnvelope,
  role: DeliveryTargetRole
): ProtocolEnvelope {
  const existingMetadata =
    typeof envelope.payload.metadata === "object" &&
    envelope.payload.metadata !== null
      ? envelope.payload.metadata
      : {};
  return {
    ...envelope,
    payload: {
      ...envelope.payload,
      metadata: {
        ...existingMetadata,
        [deliveryTargetRoleMetadataKey]: role
      }
    }
  };
}

function resolveAggregateConvergedDeliveryReason(
  deliveries: EmitTmuxDeliveryNotificationResult[]
): string | undefined {
  const failedDeliveries = deliveries.filter((delivery) => !delivery.delivered);
  if (failedDeliveries.length === 0) {
    return undefined;
  }
  if (failedDeliveries.length < deliveries.length) {
    return "partial_delivery_failed";
  }

  const reasonPriority: Array<NonNullable<EmitTmuxDeliveryNotificationResult["reason"]>> = [
    "delivery_unconfirmed",
    "tmux_send_failed",
    "registry_read_failed",
    "unsupported_recipient",
    "no_runtime_session"
  ];
  for (const reason of reasonPriority) {
    if (failedDeliveries.some((delivery) => delivery.reason === reason)) {
      return reason;
    }
  }

  return failedDeliveries.find((delivery) => delivery.reason !== undefined)?.reason;
}

function buildConvergedDelivery(
  deliveries: EmitTmuxDeliveryNotificationResult[],
  retried: boolean
): ConvergedDeliveryResult {
  const failedDeliveryCount = deliveries.filter((delivery) => !delivery.delivered).length;
  const aggregatedDeliveryReason = resolveAggregateConvergedDeliveryReason(deliveries);
  return failedDeliveryCount === 0
    ? {
        delivered: true,
        retried
      }
    : {
        delivered: false,
        ...(aggregatedDeliveryReason !== undefined
          ? { reason: aggregatedDeliveryReason }
          : {}),
        retried
      };
}

export async function executeGateDelivery(input: {
  resolved: ResolvedBubbleWorkspace;
  implementer: AgentName;
  reviewer: AgentName;
  gateResult: Awaited<ReturnType<typeof applyMetaReviewGateOnConvergence>>;
  emitDelivery: typeof emitTmuxDeliveryNotification;
  resolveMessageRef: typeof resolveDeliveryMessageRef;
}): Promise<ConvergedDeliveryResult> {
  const gateRef = input.resolveMessageRef({
    bubbleId: input.resolved.bubbleId,
    sessionsPath: input.resolved.bubblePaths.sessionsPath,
    envelope: input.gateResult.gateEnvelope
  });
  const emitDeliverySafe = async (
    envelope: ProtocolEnvelope,
    options?: {
      initialDelayMs?: number;
      deliveryAttempts?: number;
    }
  ): Promise<EmitTmuxDeliveryNotificationResult> =>
    input.emitDelivery({
      bubbleId: input.resolved.bubbleId,
      bubbleConfig: input.resolved.bubbleConfig,
      sessionsPath: input.resolved.bubblePaths.sessionsPath,
      envelope,
      messageRef: gateRef,
      ...(options?.initialDelayMs !== undefined
        ? { initialDelayMs: options.initialDelayMs }
        : {}),
      ...(options?.deliveryAttempts !== undefined
        ? { deliveryAttempts: options.deliveryAttempts }
        : {})
    }).catch(() => ({
      delivered: false,
      message: "",
      reason: "tmux_send_failed"
    }));

  const recipientEnvelopes =
    input.gateResult.gateEnvelope.type === "APPROVAL_REQUEST"
      ? [
          input.gateResult.gateEnvelope,
          withDeliveryTargetRole({
            ...input.gateResult.gateEnvelope,
            recipient: input.implementer
          }, "implementer"),
          withDeliveryTargetRole({
            ...input.gateResult.gateEnvelope,
            recipient: input.reviewer
          }, "reviewer")
        ]
      : [input.gateResult.gateEnvelope];
  let deliveryResults = await Promise.all(
    recipientEnvelopes.map((envelope) => emitDeliverySafe(envelope))
  );
  let deliveryRetried = false;

  const primaryAutoReworkDelivery = deliveryResults[0];
  const shouldRetryAutoReworkDelivery =
    input.gateResult.route === "auto_rework" &&
    recipientEnvelopes.length === 1 &&
    primaryAutoReworkDelivery !== undefined &&
    !primaryAutoReworkDelivery.delivered &&
    (
      primaryAutoReworkDelivery.reason === "delivery_unconfirmed" ||
      primaryAutoReworkDelivery.reason === "tmux_send_failed"
    );
  if (shouldRetryAutoReworkDelivery) {
    deliveryRetried = true;
    deliveryResults = [
      await emitDeliverySafe(recipientEnvelopes[0]!, {
        // Auto-rework target pane can still be spinning up after gate routing.
        // Give the CLI extra warm-up + probe attempts before giving up.
        initialDelayMs: 5000,
        deliveryAttempts: 6
      })
    ];
  }

  return buildConvergedDelivery(deliveryResults, deliveryRetried);
}
