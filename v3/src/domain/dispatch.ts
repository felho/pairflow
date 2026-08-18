import type { ActorId, BlockId, EventType, InstanceId, RoleName, StepId } from "./ids.js";
import type { AgentConfig } from "./template.js";

/**
 * ch13v2-C12 (packet ch13-p1b): ONE emitting position of a rendered
 * block. The three `source` TOKEN VALUES are C12's own and keep the
 * model's snake_case verbatim; the member's KEY spellings follow this
 * tree's camelCase convention. Only the gate-binding arm carries a
 * location — the model's `at: (step.id, event_type)` pair, FLATTENED to
 * sibling fields — so the union is what makes "a role/step source has no
 * location" a type-level fact rather than a convention.
 */
export type ContextBlockSource =
  | { readonly source: "role_config" }
  | { readonly source: "step_config" }
  | {
      readonly source: "gate_binding";
      readonly stepId: StepId;
      readonly eventType: EventType;
    };

/**
 * ch13v2-C10/C12: every place a rendered block came from, in ENCOUNTER
 * order. A repeat appends its emitter and is never collapsed — two
 * bindings of one step and event naming one id yield two IDENTICAL
 * members, which is the retained-provenance half of the dedup rule.
 */
export interface ContextBlockProvenance {
  readonly sources: readonly ContextBlockSource[];
}

/**
 * ch13v2-C10/C12 (packet ch13-p1b): ONE rendered context block on the
 * dispatch packet — the l2b `ContextBlock` registry row's witness. The
 * body is the admitted catalog entry's and can come from nowhere else
 * (a miss ABORTS at the render, never degrades). COMMUNICATION ONLY
 * (C14): no kernel decision reads it.
 */
export interface ContextBlock {
  readonly id: BlockId;
  readonly body: string;
  readonly provenance: ContextBlockProvenance;
}

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
   * ch13v2-C12 (packet ch13-p1b): the rendered context blocks — ALWAYS
   * present (a list, possibly empty), in the render's fixed order, each
   * member carrying its id, its body from the admitted catalog, and
   * every position that emitted it. COMMUNICATION ONLY (C14): no kernel
   * decision reads any of it, and the adapter carries it as data.
   */
  readonly contextBlocks: readonly ContextBlock[];
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

/**
 * l3/HumanDecisionRequest (packet ch14-p2a, K7) — the Ask.
 *
 * DERIVED, never stored, recomputable from committed state: the pending
 * DECISION_REQUEST plus the pinned template. The field list is CLOSED
 * and spelled at the TYPE grain (camelCase), because this is a
 * never-stored TS value whose sibling directive is camelCase
 * throughout; the contract's snake spellings are the MODEL's tokens it
 * quotes, not field declarations.
 *
 * THE PROVENANCE OF EACH RESOLVED FIELD IS CONTRACT, not incidental,
 * because every one has a plausible wrong source that a presence
 * assertion cannot see:
 *   - `operator` is `binding[gate.role]` — the RESOLVED ACTOR ID, never
 *     the role name;
 *   - `question` is the GATE's instruction, never the arriving step's;
 *   - `allowedDecisions` and `decisionRequirements` are the GATE's;
 *   - `expectedVersion` is the POST-COMMIT version, off by exactly one
 *     if a build projects the pre-commit instance.
 */
export interface HumanDecisionRequest {
  readonly instanceId: InstanceId;
  readonly expectedVersion: number;
  readonly requestRef: string;
  /** The resolved ACTOR id — operator-authored untrusted text (K19). */
  readonly operator: string;
  /** The gate's instruction — template-authored (K19). */
  readonly question: string;
  readonly recommendation?: string;
  readonly context: HumanDecisionContext;
  readonly allowedDecisions: readonly string[];
  readonly decisionRequirements: Readonly<Record<string, readonly string[]>>;
}

/**
 * C20's delegated projection, CLOSED at `{ task, handoff? }`: the run's
 * task, plus the request's context surface where one was recorded.
 */
export interface HumanDecisionContext {
  /** UNTRUSTED but OPERATOR-authored — a distinct provenance from actor text (K19). */
  readonly task: string;
  /** UNTRUSTED actor-authored, copied verbatim (K19). Present IFF recorded. */
  readonly handoff?: unknown;
}
