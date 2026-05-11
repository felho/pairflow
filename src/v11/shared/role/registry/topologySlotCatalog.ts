import type { AgentRole } from "../../../../contracts/kernel/agentIdentity.js";
import {
  getSharedTopologySlotPaneIndex,
  getSharedTopologySlotPaneIndexForRole,
  type SharedTopologySlotId
} from "../../topology/topologySlotPaneProjection.js";
import { getRoleDescriptor } from "./roleDescriptorRegistry.js";

export type TopologySlotId = SharedTopologySlotId;

export interface TopologySlotDescriptor {
  id: TopologySlotId;
  pane_index: number;
  bound_role_id: AgentRole | null;
}

function freezeTopologySlotDescriptor<T extends TopologySlotDescriptor>(
  descriptor: T
): Readonly<T> {
  return Object.freeze(descriptor);
}

export const topologySlotCatalog = Object.freeze({
  status: freezeTopologySlotDescriptor({
    id: "status",
    pane_index: getSharedTopologySlotPaneIndex("status"),
    bound_role_id: null
  }),
  implementer: freezeTopologySlotDescriptor({
    id: "implementer",
    pane_index: getSharedTopologySlotPaneIndex("implementer"),
    bound_role_id: "implementer"
  }),
  reviewer: freezeTopologySlotDescriptor({
    id: "reviewer",
    pane_index: getSharedTopologySlotPaneIndex("reviewer"),
    bound_role_id: "reviewer"
  }),
  meta_reviewer: freezeTopologySlotDescriptor({
    id: "meta_reviewer",
    pane_index: getSharedTopologySlotPaneIndex("meta_reviewer"),
    bound_role_id: "meta_reviewer"
  })
} as const satisfies Readonly<Record<TopologySlotId, TopologySlotDescriptor>>);

export function getTopologySlotIdForRole(role: AgentRole): TopologySlotId {
  return getRoleDescriptor(role).topology_slot_id;
}

export function getTopologySlotDescriptor(
  slotId: TopologySlotId
): TopologySlotDescriptor {
  return topologySlotCatalog[slotId];
}

export function getTopologySlotDescriptorForRole(
  role: AgentRole
): TopologySlotDescriptor {
  return getTopologySlotDescriptor(getTopologySlotIdForRole(role));
}

export function getTopologySlotPaneIndex(slotId: TopologySlotId): number {
  return getSharedTopologySlotPaneIndex(slotId);
}

export function getTopologySlotPaneIndexForRole(role: AgentRole): number {
  return getSharedTopologySlotPaneIndexForRole(role);
}
