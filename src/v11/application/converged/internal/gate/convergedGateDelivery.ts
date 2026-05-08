import type {
  DeliveryAck,
  DeliveryAckReasonCode,
  DeliveryAckStatus,
  EmitDeliveryNotificationAckPort
} from "../../../../ports/tmuxDelivery.js";
import type { ApplyMetaReviewGateOnConvergencePort } from "../../../../shared/metaReviewGate/metaReviewGateCommandContract.js";
import type { ResolvedBubbleWorkspace } from "../../../../ports/workspaceResolution.js";
import { isAgentName } from "../../../../../contracts/kernel/agentIdentity.js";
import { resolveUniquelyConfiguredRoleForAgent } from "../../../../domain/agentIdentity/agentIdentity.js";
import type { AgentName } from "../../../../../contracts/kernel/agentIdentity.js";
import type { BubbleConfig } from "../../../../shared/config/bubbleConfigTypes.js";
import type { ProtocolParticipant } from "../../../../../contracts/kernel/protocol.js";
import {
  deliveryTargetRoleMetadataKey,
  isLegacyMetaReviewerProtocolRecipient,
  parseDeliveryTargetRoleMetadata,
  type DeliveryTargetRole,
  type LegacyMetaReviewerProtocolRecipient,
  type ProtocolEnvelope
} from "../../../../../types/protocol.js";
import { executeImplementerHandoffDelivery } from "../../../../shared/delivery/implementerHandoffDelivery.js";
import {
  buildDefaultConvergedGateDeliveryDependencies,
  type ResolvedConvergedGateDeliveryDependencies
} from "../orchestration/convergedDefaultDependencies.js";

const compatPrimaryDeliveryRoles = ["implementer", "reviewer"] as const;
type CompatProtocolRecipient =
  | ProtocolParticipant
  | LegacyMetaReviewerProtocolRecipient;

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

function resolveCompatParticipantRoleFromAgents(input: {
  recipient: CompatProtocolRecipient;
  bubbleConfig: BubbleConfig;
}): DeliveryTargetRole | undefined {
  if (input.recipient === "human" || input.recipient === "orchestrator") {
    return "status";
  }
  if (isLegacyMetaReviewerProtocolRecipient(input.recipient)) {
    return "meta_reviewer";
  }
  if (isAgentName(input.recipient)) {
    // Bare agent identity fallback only recovers implementer/reviewer parity.
    // Meta-review stays explicit through retained literal recipient or
    // delivery_target_role metadata.
    return resolveUniquelyConfiguredRoleForAgent({
      agents: input.bubbleConfig.agents,
      agent: input.recipient,
      roles: compatPrimaryDeliveryRoles
    });
  }
  return undefined;
}

function resolveConvergedDeliveryTargetRole(input: {
  envelope: ProtocolEnvelope;
  bubbleConfig: BubbleConfig;
}): DeliveryTargetRole | undefined {
  const parsed = parseDeliveryTargetRoleMetadata(input.envelope.payload.metadata);
  if (parsed.status === "valid") {
    return parsed.role;
  }
  return resolveCompatParticipantRoleFromAgents({
    recipient: input.envelope.recipient,
    bubbleConfig: input.bubbleConfig
  });
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
  gateResult: Awaited<ReturnType<ApplyMetaReviewGateOnConvergencePort>>;
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
  ): Promise<DeliveryAck> => {
    const recipientRole = resolveConvergedDeliveryTargetRole({
      envelope,
      bubbleConfig: input.resolved.bubbleConfig
    });
    return resolvedDependencies.emitDeliveryNotificationAck({
      bubbleId: input.resolved.bubbleId,
      bubbleConfig: input.resolved.bubbleConfig,
      sessionsPath: input.resolved.bubblePaths.sessionsPath,
      envelope,
      ...(recipientRole !== undefined ? { recipientRole } : {}),
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
  };

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
