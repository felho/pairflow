import type { ActorId, EventType, InstanceId, RoleName } from "./ids.js";

/**
 * Kernel output (ledger §4 l0b + l1) — derived, never stored. No store
 * surface accepts these.
 */
export interface ContextPacket {
  readonly instanceId: InstanceId;
  readonly expectedVersion: number;
  readonly task: string;
  /** The dispatched-as role (l1) — the actor echoes it back as `expectedRole`. */
  readonly role: RoleName;
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
