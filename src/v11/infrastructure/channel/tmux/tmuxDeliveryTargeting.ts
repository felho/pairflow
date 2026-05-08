import type { BubbleConfig } from "../../../shared/config/bubbleConfigTypes.js";
import { isAgentName } from "../../../../contracts/kernel/agentIdentity.js";
import { resolveUniquelyConfiguredRoleForAgent } from "../../../domain/agentIdentity/agentIdentity.js";
import {
  getSharedTopologySlotPaneIndex,
  getSharedTopologySlotPaneIndexForRole
} from "../../../shared/topology/topologySlotPaneProjection.js";
import type { ProtocolParticipant } from "../../../../contracts/kernel/protocol.js";
import {
  isLegacyMetaReviewerProtocolRecipient,
  parseDeliveryTargetRoleMetadata,
  type DeliveryTargetRole,
  type LegacyMetaReviewerProtocolRecipient,
  type ProtocolEnvelope
} from "../../../../types/protocol.js";
import type { DeliveryTargetReasonCode } from "../../../shared/delivery/tmuxDeliveryContract.js";
import type { DeliveryMessageRecipientRole } from "./tmuxDeliveryMessageBuilder.js";

const compatPrimaryDeliveryRoles = ["implementer", "reviewer"] as const;
type CompatProtocolRecipient =
  | ProtocolParticipant
  | LegacyMetaReviewerProtocolRecipient;

function normalizePaneIndex(value: unknown): number | undefined {
  return typeof value === "number" && Number.isInteger(value) && value >= 0
    ? value
    : undefined;
}

function resolveCompatDeliveryTargetRoleFromRecipient(
  recipient: CompatProtocolRecipient,
  bubbleConfig: BubbleConfig
): DeliveryTargetRole | undefined {
  if (recipient === "human" || recipient === "orchestrator") {
    return "status";
  }
  if (isLegacyMetaReviewerProtocolRecipient(recipient)) {
    return "meta_reviewer";
  }
  if (isAgentName(recipient)) {
    // Bare agent identity fallback is only allowed to recover the primary
    // implementer/reviewer lanes. Meta-review routing must remain explicit
    // through metadata or the retained literal "meta-reviewer" recipient.
    return resolveUniquelyConfiguredRoleForAgent({
      agents: bubbleConfig.agents,
      agent: recipient,
      roles: compatPrimaryDeliveryRoles
    });
  }
  return undefined;
}

export function resolveTargetPaneIndex(
  recipient: CompatProtocolRecipient,
  bubbleConfig: BubbleConfig
): number | undefined {
  const resolvedRole = resolveCompatDeliveryTargetRoleFromRecipient(
    recipient,
    bubbleConfig
  );
  if (resolvedRole === undefined) {
    return undefined;
  }
  return normalizePaneIndex(
    resolvedRole === "status"
      ? getSharedTopologySlotPaneIndex("status")
      : getSharedTopologySlotPaneIndexForRole(resolvedRole)
  );
}

function resolveRecipientRoleFromRecipient(
  recipient: CompatProtocolRecipient,
  bubbleConfig: BubbleConfig
): DeliveryMessageRecipientRole {
  const resolvedRole = resolveCompatDeliveryTargetRoleFromRecipient(
    recipient,
    bubbleConfig
  );
  if (resolvedRole === "meta_reviewer") {
    return "meta-reviewer";
  }
  if (resolvedRole === "implementer" || resolvedRole === "reviewer") {
    return resolvedRole;
  }
  return recipient;
}

function resolveRecipientRoleFromDeliveryTargetRole(
  role: DeliveryTargetRole
): DeliveryMessageRecipientRole {
  return role === "meta_reviewer" ? "meta-reviewer" : role;
}

export function resolveEnvelopeRecipientRole(
  envelope: ProtocolEnvelope,
  bubbleConfig: BubbleConfig,
  explicitRecipientRole?: DeliveryTargetRole
): DeliveryMessageRecipientRole {
  if (explicitRecipientRole !== undefined) {
    return resolveRecipientRoleFromDeliveryTargetRole(explicitRecipientRole);
  }
  const fallbackRecipientRole = resolveRecipientRoleFromRecipient(
    envelope.recipient,
    bubbleConfig
  );
  const parsed = parseDeliveryTargetRoleMetadata(envelope.payload.metadata);
  if (parsed.status === "absent" || parsed.status === "invalid") {
    return fallbackRecipientRole;
  }
  if (parsed.role === "meta_reviewer") {
    return "meta-reviewer";
  }
  return parsed.role;
}

function resolvePaneIndexByDeliveryTargetRole(role: DeliveryTargetRole): number | undefined {
  return normalizePaneIndex(getSharedTopologySlotPaneIndex(role));
}

export interface EnvelopeTargetPaneResolution {
  targetPaneIndex: number | undefined;
  recipientRole: DeliveryMessageRecipientRole;
  deliveryTargetReasonCode?: DeliveryTargetReasonCode;
}

export function resolveEnvelopeTargetPane(
  envelope: ProtocolEnvelope,
  bubbleConfig: BubbleConfig,
  explicitRecipientRole?: DeliveryTargetRole
): EnvelopeTargetPaneResolution {
  if (explicitRecipientRole !== undefined) {
    const explicitPane = resolvePaneIndexByDeliveryTargetRole(explicitRecipientRole);
    return {
      targetPaneIndex: explicitPane,
      recipientRole: resolveRecipientRoleFromDeliveryTargetRole(explicitRecipientRole),
      ...(explicitPane === undefined
        ? { deliveryTargetReasonCode: "DELIVERY_TARGET_ROLE_UNMAPPED" as const }
        : {})
    };
  }

  const fallbackPane = resolveTargetPaneIndex(envelope.recipient, bubbleConfig);
  const fallbackRecipientRole = resolveRecipientRoleFromRecipient(
    envelope.recipient,
    bubbleConfig
  );
  const parsed = parseDeliveryTargetRoleMetadata(envelope.payload.metadata);
  if (parsed.status === "absent") {
    return {
      targetPaneIndex: fallbackPane,
      recipientRole: fallbackRecipientRole,
      deliveryTargetReasonCode: "DELIVERY_TARGET_ROLE_ABSENT"
    };
  }
  if (parsed.status === "invalid") {
    return {
      targetPaneIndex: fallbackPane,
      recipientRole: fallbackRecipientRole,
      deliveryTargetReasonCode: "DELIVERY_TARGET_ROLE_INVALID"
    };
  }
  const explicitPane = resolvePaneIndexByDeliveryTargetRole(parsed.role);
  if (explicitPane === undefined) {
    return {
      targetPaneIndex: fallbackPane,
      recipientRole: fallbackRecipientRole,
      deliveryTargetReasonCode: "DELIVERY_TARGET_ROLE_UNMAPPED"
    };
  }
  if (parsed.role === "meta_reviewer") {
    return {
      targetPaneIndex: explicitPane,
      recipientRole: "meta-reviewer"
    };
  }
  return {
    targetPaneIndex: explicitPane,
    recipientRole: parsed.role
  };
}
