import type { ActorId, EventType, InstanceId, RoleName } from "./ids.js";
import type { AgentConfig } from "./template.js";

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
  /**
   * The resolved run profile (packet ch12-p2, E1/E2): the L0c cascade's
   * portable run INTENT, ALWAYS present (a map, possibly `{}`) — it
   * REPLACES the L0b raw `agentConfig` conditional pass-through. Opaque
   * (C7); ref resolution is the ch-9 ActorAdapter / L2b ContextAssembly,
   * later.
   */
  readonly effectiveAgentConfig: AgentConfig;
}

export interface DispatchIntent {
  readonly actor: ActorId;
  readonly packet: ContextPacket;
}
