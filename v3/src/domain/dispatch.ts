import type { ActorId, EventType, InstanceId, RoleName } from "./ids.js";
import type { AgentConfig } from "./template.js";

/**
 * l0e/RuntimeContextProjection (packet ch12-p3, T2): the actor-facing view of
 * a provisioned runtime context — a BRANDED OPAQUE type (the codebase
 * `AdmittedTemplate` brand idiom). A NOMINAL type produced ONLY by a
 * provider's `projectForActor` (its impl casts its return), carrying NO
 * value-domain constraint at runtime — the unique-symbol brand is a
 * compile-time TYPE EXPRESSION, ERASED at runtime, so any canonical-JSON-safe
 * value the provider returns is admissible (value-safety is the RUNTIME
 * `isCanonicalizable` gate at the `projectForActor` return, PR4, never the
 * static type). The brand makes the type DISTINCT from `RuntimeContextRef`
 * (`{kind, locator}`, UNBRANDED) — so `packet.runtimeContext ← ref` is a
 * COMPILE ERROR, which is what genuinely type-enforces `projection-never-the-ref`.
 */
declare const projectionBrand: unique symbol;
export type RuntimeContextProjection = { readonly [projectionBrand]: true };

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
  /**
   * l0e/RuntimeContextProjection (packet ch12-p3, E1/T2): the actor-facing
   * runtime-context view — the branded projection for a provisioned run
   * (`projectForActor(ready_ref)`, resolved through the same pinned-template
   * provider that issued the request) OR the explicit literal `"none"` for a
   * context-free workflow. NON-OPTIONAL and always present: the actor sees
   * the projection or an explicit `none`, NEVER the raw ref (compile-enforced
   * by the brand) and never an absent field (`projection-never-the-ref`).
   */
  readonly runtimeContext: RuntimeContextProjection | "none";
}

export interface DispatchIntent {
  readonly actor: ActorId;
  readonly packet: ContextPacket;
}
