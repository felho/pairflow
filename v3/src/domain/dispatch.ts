import type { ActorId, EventType, InstanceId } from "./ids.js";

/**
 * Kernel output (ledger §4 l0b) — derived, never stored. No store
 * surface accepts these.
 */
export interface ContextPacket {
  readonly instanceId: InstanceId;
  readonly expectedVersion: number;
  readonly task: string;
  readonly instruction: string;
  /** The envelope payload that brought us here; absent at start. Opaque. */
  readonly handoff?: unknown;
  readonly availableOps: readonly EventType[];
  /** Raw optional pass-through until L0c. Opaque. */
  readonly agentConfig?: unknown;
}

export interface DispatchIntent {
  readonly actor: ActorId;
  readonly packet: ContextPacket;
}
