import type { AgentRole } from "../../../types/bubble.js";

export type SharedTopologySlotId = "status" | AgentRole;

export const topologySlotPaneIndexCatalog = Object.freeze({
  status: 0,
  implementer: 1,
  reviewer: 2,
  meta_reviewer: 3
} as const satisfies Readonly<Record<SharedTopologySlotId, number>>);

export function getSharedTopologySlotPaneIndex(
  slotId: SharedTopologySlotId
): number {
  return topologySlotPaneIndexCatalog[slotId];
}

export function getSharedTopologySlotPaneIndexForRole(role: AgentRole): number {
  return getSharedTopologySlotPaneIndex(role);
}
