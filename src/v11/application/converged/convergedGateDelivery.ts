import type {
  DeliveryAck,
  DeliveryAckReasonCode,
  DeliveryAckStatus,
  EmitDeliveryNotificationAckPort
} from "../../shared/ports/tmuxDelivery.js";
import type { applyMetaReviewGateOnConvergence } from "../../shared/metaReviewGate/metaReviewGateCommandApi.js";
import type { ResolvedBubbleWorkspace } from "../../shared/ports/workspaceResolution.js";
import type { AgentName } from "../../../types/bubble.js";
import {
  deliveryTargetRoleMetadataKey,
  parseDeliveryTargetRoleMetadata,
  type DeliveryTargetRole,
  type ProtocolEnvelope
} from "../../../types/protocol.js";
import { executeImplementerHandoffDelivery } from "../../shared/delivery/implementerHandoffDelivery.js";
import {
  buildDefaultConvergedGateDeliveryDependencies,
  type ResolvedConvergedGateDeliveryDependencies
} from "./convergedDefaultDependencies.js";

export interface ConvergedDeliveryResult {
  status: DeliveryAckStatus;
  reason?: string;
  reason_code?: DeliveryAckReasonCode;
  retried: boolean;
}

interface NormalizedConvergedDelivery {
  status: DeliveryAckStatus;
  reason?: Extract<DeliveryAck, { status: "rejected" }>["reason"];
  reason_code?: DeliveryAckReasonCode;
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

function resolveConvergedDeliveryTargetRole(input: {
  envelope: ProtocolEnvelope;
  implementer: AgentName;
  reviewer: AgentName;
}): DeliveryTargetRole {
  const parsed = parseDeliveryTargetRoleMetadata(input.envelope.payload.metadata);
  if (parsed.status === "valid") {
    return parsed.role;
  }
  if (input.envelope.recipient === input.implementer) {
    return "implementer";
  }
  if (input.envelope.recipient === input.reviewer) {
    return "reviewer";
  }
  return "status";
}

function normalizeConvergedDelivery(
  delivery: DeliveryAck
): NormalizedConvergedDelivery {
  return {
    status: delivery.status,
    ...(delivery.reason !== undefined ? { reason: delivery.reason } : {}),
    ...(delivery.reason_code !== undefined
      ? { reason_code: delivery.reason_code }
      : {})
  };
}

function resolveAggregateConvergedDeliveryReason(
  deliveries: NormalizedConvergedDelivery[]
): string | undefined {
  const failedDeliveries = deliveries.filter(
    (delivery) => delivery.status === "rejected"
  );
  if (failedDeliveries.length === 0) {
    return undefined;
  }
  if (failedDeliveries.length < deliveries.length) {
    return "partial_delivery_failed";
  }

  const reasonPriority: Array<Extract<DeliveryAck, { status: "rejected" }>["reason"]> = [
    "delivery_unconfirmed",
    "command_failed",
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
  deliveries: DeliveryAck[],
  retried: boolean
): ConvergedDeliveryResult {
  const normalizedDeliveries = deliveries.map(normalizeConvergedDelivery);
  const failedDeliveries = normalizedDeliveries.filter(
    (delivery) => delivery.status === "rejected"
  );
  const failedDeliveryCount = failedDeliveries.length;
  const aggregatedDeliveryReason =
    resolveAggregateConvergedDeliveryReason(normalizedDeliveries);
  const aggregatedReasonCode =
    failedDeliveryCount > 0
      ? failedDeliveries.find((delivery) => delivery.reason_code !== undefined)?.reason_code
      : undefined;
  return failedDeliveryCount === 0
      ? {
        status: "accepted",
        retried
      }
    : {
        status: "rejected",
        ...(aggregatedDeliveryReason !== undefined
          ? { reason: aggregatedDeliveryReason }
          : {}),
        ...(aggregatedReasonCode !== undefined
          ? { reason_code: aggregatedReasonCode }
          : {}),
        retried
      };
}

export async function executeGateDelivery(input: {
  resolved: ResolvedBubbleWorkspace;
  implementer: AgentName;
  reviewer: AgentName;
  gateResult: Awaited<ReturnType<typeof applyMetaReviewGateOnConvergence>>;
  emitDelivery: EmitDeliveryNotificationAckPort;
  resolveMessageRef: ResolvedConvergedGateDeliveryDependencies["resolveDeliveryMessageRef"];
}): Promise<ConvergedDeliveryResult> {
  const resolvedDependencies = buildDefaultConvergedGateDeliveryDependencies({
    emitDeliveryNotificationAck: input.emitDelivery,
    resolveDeliveryMessageRef: input.resolveMessageRef
  });
  const gateRef = resolvedDependencies.resolveDeliveryMessageRef({
    bubbleId: input.resolved.bubbleId,
    sessionsPath: input.resolved.bubblePaths.sessionsPath,
    envelope: input.gateResult.gateEnvelope
  });
  const emitDeliveryNotificationAck = async (
    envelope: ProtocolEnvelope,
    options?: {
      initialDelayMs?: number;
      deliveryAttempts?: number;
    }
  ): Promise<DeliveryAck> =>
    resolvedDependencies.emitDeliveryNotificationAck({
      bubbleId: input.resolved.bubbleId,
      bubbleConfig: input.resolved.bubbleConfig,
      sessionsPath: input.resolved.bubblePaths.sessionsPath,
      envelope,
      recipientRole: resolveConvergedDeliveryTargetRole({
        envelope,
        implementer: input.implementer,
        reviewer: input.reviewer
      }),
      messageRef: gateRef,
      ...(options?.initialDelayMs !== undefined
        ? { initialDelayMs: options.initialDelayMs }
        : {}),
      ...(options?.deliveryAttempts !== undefined
        ? { deliveryAttempts: options.deliveryAttempts }
        : {})
    }).catch(() => ({
      status: "rejected",
      message: "",
      reason: "command_failed",
      reason_code: "DELIVERY_ACK_REJECTED"
    }));

  if (input.gateResult.route === "auto_rework") {
    const autoReworkDeliveryInput = {
      bubbleId: input.resolved.bubbleId,
      bubbleConfig: input.resolved.bubbleConfig,
      sessionsPath: input.resolved.bubblePaths.sessionsPath,
      envelope: input.gateResult.gateEnvelope,
      recipientRole: "implementer",
      messageRef: gateRef
    } as const;
    const autoReworkDelivery = await executeImplementerHandoffDelivery({
      deliveryInput: autoReworkDeliveryInput,
      emitDelivery: resolvedDependencies.emitDeliveryNotificationAck
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
    recipientEnvelopes.map((envelope) => emitDeliveryNotificationAck(envelope))
  );

  return buildConvergedDelivery(deliveryResults, false);
}
