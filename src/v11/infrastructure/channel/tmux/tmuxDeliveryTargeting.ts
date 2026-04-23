import type { BubbleConfig } from "../../../../types/bubble.js";
import {
  parseDeliveryTargetRoleMetadata,
  type DeliveryTargetRole,
  type ProtocolEnvelope,
  type ProtocolParticipant
} from "../../../../types/protocol.js";
import { runtimePaneIndices } from "./tmuxManager.js";
import type { DeliveryTargetReasonCode } from "../../../shared/delivery/tmuxDeliveryContract.js";
import type { DeliveryMessageRecipientRole } from "./tmuxDeliveryMessageBuilder.js";

function normalizePaneIndex(value: unknown): number | undefined {
  return typeof value === "number" && Number.isInteger(value) && value >= 0
    ? value
    : undefined;
}

export function resolveTargetPaneIndex(
  recipient: ProtocolParticipant | "meta-reviewer",
  bubbleConfig: BubbleConfig
): number | undefined {
  if (recipient === bubbleConfig.agents.implementer) {
    return normalizePaneIndex(runtimePaneIndices.implementer);
  }
  if (recipient === bubbleConfig.agents.reviewer) {
    return normalizePaneIndex(runtimePaneIndices.reviewer);
  }
  if (recipient === "meta-reviewer") {
    return normalizePaneIndex(runtimePaneIndices.metaReviewer);
  }
  if (recipient === "human" || recipient === "orchestrator") {
    return normalizePaneIndex(runtimePaneIndices.status);
  }
  return undefined;
}

function resolveRecipientRoleFromRecipient(
  recipient: ProtocolParticipant | "meta-reviewer",
  bubbleConfig: BubbleConfig
): DeliveryMessageRecipientRole {
  if (recipient === bubbleConfig.agents.implementer) {
    return "implementer";
  }
  if (recipient === bubbleConfig.agents.reviewer) {
    return "reviewer";
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
  if (role === "implementer") {
    return normalizePaneIndex(runtimePaneIndices.implementer);
  }
  if (role === "reviewer") {
    return normalizePaneIndex(runtimePaneIndices.reviewer);
  }
  if (role === "meta_reviewer") {
    return normalizePaneIndex(runtimePaneIndices.metaReviewer);
  }
  return normalizePaneIndex(runtimePaneIndices.status);
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
