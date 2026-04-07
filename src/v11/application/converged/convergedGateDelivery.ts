import type {
  EmitTmuxDeliveryNotificationResult
} from "../../shared/ports/tmuxDelivery.js";
import type { applyMetaReviewGateOnConvergence } from "../../shared/metaReviewGate/metaReviewGateCommandApi.js";
import type { ResolvedBubbleWorkspace } from "../../shared/ports/workspaceResolution.js";
import type { AgentName } from "../../../types/bubble.js";
import {
  deliveryTargetRoleMetadataKey,
  type DeliveryTargetRole,
  type ProtocolEnvelope
} from "../../../types/protocol.js";
import { executeImplementerHandoffDelivery } from "../../shared/delivery/implementerHandoffDelivery.js";
import {
  buildDefaultConvergedGateDeliveryDependencies,
  type ResolvedConvergedGateDeliveryDependencies
} from "../../shared/converged/convergedFlowInvocationBuilders.js";

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
  emitDelivery: ResolvedConvergedGateDeliveryDependencies["emitTmuxDeliveryNotification"];
  resolveMessageRef: ResolvedConvergedGateDeliveryDependencies["resolveDeliveryMessageRef"];
}): Promise<ConvergedDeliveryResult> {
  const resolvedDependencies = buildDefaultConvergedGateDeliveryDependencies({
    emitTmuxDeliveryNotification: input.emitDelivery,
    resolveDeliveryMessageRef: input.resolveMessageRef
  });
  const gateRef = resolvedDependencies.resolveDeliveryMessageRef({
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
    resolvedDependencies.emitTmuxDeliveryNotification({
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

  if (input.gateResult.route === "auto_rework") {
    const autoReworkDeliveryInput = {
      bubbleId: input.resolved.bubbleId,
      bubbleConfig: input.resolved.bubbleConfig,
      sessionsPath: input.resolved.bubblePaths.sessionsPath,
      envelope: input.gateResult.gateEnvelope,
      messageRef: gateRef
    } as const;
    const autoReworkDelivery = await executeImplementerHandoffDelivery({
      deliveryInput: autoReworkDeliveryInput,
      emitDelivery: resolvedDependencies.emitTmuxDeliveryNotification
    });
    return buildConvergedDelivery(
      [
        autoReworkDelivery.result
      ],
      autoReworkDelivery.retried
    );
  }

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

  const deliveryResults = await Promise.all(
    recipientEnvelopes.map((envelope) => emitDeliverySafe(envelope))
  );

  return buildConvergedDelivery(deliveryResults, false);
}
