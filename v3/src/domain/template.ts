import type { GateBinding } from "./gate.js";
import type { ActorId, EventType, RoleName, StepId } from "./ids.js";
import type { ActivationMode } from "./instance.js";

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

/**
 * l0c/AgentConfig (packet ch12-p2, T1): the run PROFILE — a MAP, raw and
 * format-OPEN, no field kernel-interpreted (C7). The model's field names
 * (`mode`, `approach`, `model_ref`, `prompt_profile_refs`, `skill_refs`,
 * `tool_policy_ref`, …) are run-intent hints no kernel component reads or
 * type-enforces (the no-speculative-keys rule). Resolved by the L0c
 * cascade (`kernel/agentConfig.ts`), carried as the packet's
 * `effectiveAgentConfig` and recorded as the transcript's
 * `issuedAgentConfig`.
 */
export type AgentConfig = Readonly<Record<string, unknown>>;

export interface Step {
  readonly role: RoleName;
  readonly instruction: string;
  /** event_type → target step; every target ∈ steps ∪ terminal. */
  readonly transitions: Readonly<Record<EventType, StepId>>;
  /**
   * The step's run-profile override (packet ch12-p2, T1): the SECOND
   * cascade layer (`role.defaultAgentConfig ⊕ step.agentConfig ⊕
   * instance.runOverrides[step]`). A MAP, kernel-opaque (C7); narrowed to
   * map + canonical-JSON-safe at admission (A1). ABSENT contributes `{}`.
   */
  readonly agentConfig?: AgentConfig;
  /**
   * D1 (packet ch11-P2a): the per-(event-type) gate pipeline realizing
   * the model's `gates_for(step, event_type)`. ABSENT = ungated (C1).
   * Since ch11-P4 the FILE format carries a `gates` key (the format walk
   * lands the authoring surface, F2/F3); the walk delivers the resolved
   * value into this slot, and directly-constructed templates set it
   * straight — both reach admission through the SAME function.
   */
  readonly gates?: Readonly<Record<EventType, readonly GateBinding[]>>;
  /**
   * D2 (packet ch11-P2c): the model's "explicit per-transition
   * advances_round flags" as a parallel step key (the `gates` C1-pattern
   * precedent; transitions' scalar targets stay untouched). On an
   * ADMITTED template the map is COMPLETE per step — every
   * `keys(transitions)` member present with an explicit boolean; a step
   * with no transitions carries an empty map. `admitTemplate` is the only
   * producer of complete maps (D3); the kernel consumes ONLY these flags
   * (C39's ban on inference). ABSENT on a raw directly-constructed
   * template — admission expands the `round` declaration into it.
   */
  readonly advancesRound?: Readonly<Record<EventType, boolean>>;
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
  /**
   * Actor defaults (l0b): resolve_binding = default_actor + start
   * overrides. `defaultAgentConfig` (packet ch12-p2, T2) is the run
   * profile's FIRST cascade layer (C7) — a map, kernel-opaque; narrowed
   * to map + canonical-JSON-safe at admission on the direct-construction
   * channel (A2; the file source-form walk is P4's). ABSENT contributes
   * `{}`.
   */
  readonly roles: Readonly<
    Record<RoleName, { readonly defaultActor?: ActorId; readonly defaultAgentConfig?: AgentConfig }>
  >;
  /** L1 explicit restrictions (none in the baseline) — see CapabilityProfile. */
  readonly capabilityProfile?: CapabilityProfile;
  /**
   * D1 (packet ch11-P2c): the C37 authoring shape at the DOMAIN grain
   * (the direct channel's input; since ch11-P4 the YAML `round` key maps
   * onto it through the format walk, F5). ABSENT = C38's none-default (no
   * advancing transition after activation). This is admission's INPUT —
   * the flags (Step.advancesRound, D2) are the kernel's ONLY consumption
   * surface (C39); admission validates and expands it but NEVER mutates
   * it (A4).
   */
  readonly round?: { readonly advanceOnArrivalAt: readonly StepId[] };
  /**
   * D1 (packet ch11-P3a): the C18 runtime-context declaration at the DOMAIN
   * grain — the sole legal value is the string literal `"required"` (the
   * literal type forecloses every other value on the direct channel; since
   * ch11-P4 the file-channel illegal-value lane is admission's A3, guarding
   * the raw YAML value the walk passes through F4). ABSENT = a context-free
   * workflow. A template declaring any process gate (a
   * `requiresRuntimeContext` registration) without this field FAILS admission
   * (the C19 cross-rule, V5). `admitTemplate` carries the field through
   * unchanged (the template-root spread). Named exclusion with home: the
   * ref-supplying start/provisioning surface — ch9.
   */
  readonly runtimeContext?: "required";
  /**
   * G3 (packet ch12-p1b): the C1 activation default at the DOMAIN
   * grain — the per-workflow default mode. OPTIONAL on a raw
   * directly-constructed template; `admitTemplate` MATERIALIZES an
   * absent key to `{mode: "immediate"}` on the admitted value (the
   * `advancesRound` admission-expansion pattern; C1's "materialized
   * once at admission"). The FILE key stays unauthorable until P4
   * (the ch8 unknown-key rejection stands — C25's window); the
   * authored camelCase faces are the create wire and P4's walk.
   */
  readonly activation?: { readonly mode: ActivationMode };
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
