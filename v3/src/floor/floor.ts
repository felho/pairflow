import type { InstanceId, WorkflowInstance } from "../domain/index.js";
import type { InstanceDetail, StorePort } from "../ports/store.js";

/**
 * The minimal visibility-floor read (plan §4.6): committed rows only —
 * trivially, the store holds nothing else. Read-only by construction
 * (REV-C-PROJECTIONS-READONLY); the full floor (getTimeline, live tail)
 * is chapter-6 work (PI-2) and grows THIS seam.
 */
export interface Floor {
  listInstances(): Promise<readonly WorkflowInstance[]>;
  getInstanceDetail(instanceId: InstanceId): Promise<InstanceDetail | null>;
}

export function createFloor(store: StorePort): Floor {
  return {
    listInstances: () => store.listInstances(),
    getInstanceDetail: (instanceId) => store.getInstanceDetail(instanceId),
  };
}
