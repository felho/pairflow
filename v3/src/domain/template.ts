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
