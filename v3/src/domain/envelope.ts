import type { ActorId, EventType, InstanceId, OpId } from "./ids.js";

/**
 * Message — crosses the boundary (ledger §4 l0a). `expectedVersion` is
 * semantically mandatory at L0b but OPTIONAL in the type so the
 * `missing_version` branch stays representable. `eventId` is delivery
 * provenance pass-through (the l0a trace literal); no L0b logic consumes
 * it. Payload stays opaque — later levels own its shape.
 */
export interface EventEnvelope {
  readonly instanceId: InstanceId;
  readonly opId: OpId;
  readonly type: EventType;
  readonly actorId: ActorId;
  readonly expectedVersion?: number;
  /**
   * The role the actor claims to act as — the Warrant's second
   * context-authority field (l1-pseudocode/warrant). Semantically
   * mandatory for actor envelopes from L1 on but OPTIONAL in the type
   * so the `missing_role` branch stays representable (the
   * `expectedVersion` precedent above). The kernel VERIFIES it against
   * the position's active role; it never invents or defaults it.
   */
  readonly expectedRole?: string;
  readonly eventId?: string;
  readonly payload?: unknown;
}
