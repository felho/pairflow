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
  readonly eventId?: string;
  readonly payload?: unknown;
}
