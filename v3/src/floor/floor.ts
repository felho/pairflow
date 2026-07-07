import type { InstanceId, TranscriptEntry, WorkflowInstance } from "../domain/index.js";
import type { InstanceDetail, StorePort } from "../ports/store.js";

/**
 * The read-only visibility floor (plan §4.6, growing per §6.2):
 * committed rows only — stated wide: no diagnostic or non-committed
 * data can ever enter this surface (the diagnostic channel is ch 7,
 * separate). Read-only by construction (REV-C-PROJECTIONS-READONLY).
 * Remaining ch-6 growth: the tail seed (P2) and the debug bundle (P3).
 */
export interface Floor {
  listInstances(): Promise<readonly WorkflowInstance[]>;
  getInstanceDetail(instanceId: InstanceId): Promise<InstanceDetail | null>;
  /**
   * §6.2 cursor read (packet ch6-P1): committed rows strictly after
   * `afterSeq`, seq-ascending. Unknown instance = null, known-but-empty
   * = [] — the caller must be able to tell "no such run" from "no new
   * rows". Invalid cursors (not a nonnegative safe integer) fail closed
   * with RangeError, delegated from the store.
   */
  getTimeline(
    instanceId: InstanceId,
    afterSeq: number,
  ): Promise<readonly TranscriptEntry[] | null>;
}

export function createFloor(store: StorePort): Floor {
  return {
    listInstances: () => store.listInstances(),
    getInstanceDetail: (instanceId) => store.getInstanceDetail(instanceId),
    getTimeline: (instanceId, afterSeq) => store.getTimeline(instanceId, afterSeq),
  };
}
