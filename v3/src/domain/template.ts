import type { GateBinding } from "./gate.js";
import type { ActorId, EventType, RoleName, StepId } from "./ids.js";

/**
 * Template aggregate (ledger §4 l0a + l0b) — the definition, immutable
 * at runtime. A run is pinned to a TemplateRef snapshot { id, version }.
 * Well-formedness VALIDATION is realized in `src/definition/` (the
 * fail-at-create pipeline, ch8-P1); the canonical authoring file is
 * the template's single source (MD-1 retired at ch8-P2, 2026-07-11).
 */
export interface TemplateRef {
  readonly id: string;
  readonly version: number;
}

export interface Step {
  readonly role: RoleName;
  readonly instruction: string;
  /** event_type → target step; every target ∈ steps ∪ terminal. */
  readonly transitions: Readonly<Record<EventType, StepId>>;
  /** Raw optional pass-through until L0c (dispatch_intent unit comment). */
  readonly agentConfig?: unknown;
  /**
   * D1 (packet ch11-P2a): the per-(event-type) gate pipeline realizing
   * the model's `gates_for(step, event_type)`. ABSENT = ungated (C1).
   * The FILE format never carries a `gates` key until P4 (it stays the
   * ch8 unknown-key rejection); this domain field is reached only by
   * directly-constructed templates through admission.
   */
  readonly gates?: Readonly<Record<EventType, readonly GateBinding[]>>;
}

/**
 * The L1 authorization profile (ledger §4 l1): (role × step_id) → the
 * allowed action set. TYPE-LEVEL ONLY — the authoring format never
 * carries it (authored restrictions are a deferred Absent; a
 * `capabilityProfile` key in a template FILE stays an unknown-key
 * rejection). Explicit profiles enter via directly-constructed values
 * (tests); absent, `capability()` default-derives from the step graph.
 */
export type CapabilityProfile = Readonly<
  Record<RoleName, Readonly<Record<StepId, readonly EventType[]>>>
>;

export interface WorkflowTemplate {
  readonly ref: TemplateRef;
  readonly start: StepId;
  readonly steps: Readonly<Record<StepId, Step>>;
  /** "target is terminal" ⇔ listed here. */
  readonly terminal: readonly StepId[];
  /** Actor defaults (l0b): resolve_binding = default_actor + start overrides. */
  readonly roles: Readonly<Record<RoleName, { readonly defaultActor?: ActorId }>>;
  /** L1 explicit restrictions (none in the baseline) — see CapabilityProfile. */
  readonly capabilityProfile?: CapabilityProfile;
}

/**
 * D6 (packet ch11-P2a): the branded admitted template — the ledger's
 * `AdmittedDefinition`, realized under the codebase's `WorkflowTemplate`
 * naming. `admitTemplate` (definition/admit.ts) is the ONLY sanctioned
 * producer; the brand is the store PORT CONTRACT's type expression, not
 * a runtime mechanism. The unique-symbol brand is DECLARED (no runtime
 * value exists — nothing to export, C20's "produced in one place and
 * never re-checked"); a `DefinitionStore` yields only this form.
 */
declare const admittedBrand: unique symbol;
export type AdmittedTemplate = WorkflowTemplate & { readonly [admittedBrand]: true };
