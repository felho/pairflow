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

/**
 * l0e/RuntimeContextSpec (packet ch12-p3, T1/R3): the provisioning spec a
 * template declares when it requires a runtime context — the FIXED-KEYSET
 * `{kind, provider, config?}` (C3). `kind` selects the context kind
 * (`worktree` for v1), `provider` names the fulfiller resolved against the
 * injected `ProviderRegistry` at START, and `config` is an OPTIONAL
 * provider-owned raw pass-through map (kernel-uninterpreted). The `kind`/
 * `provider` string GRAMMARS are a parameterized family with a file-channel
 * source-form walk (ch12-P4, F3) beside the direct-construction channel.
 */
export interface RuntimeContextSpec {
  readonly kind: string;
  readonly provider: string;
  readonly config?: Readonly<Record<string, unknown>>;
}

/**
 * l0e/RuntimeContextRequirement (packet ch12-p3, T1): the read-time VIEW of
 * a template's runtime-context declaration — `none` (the workflow declares
 * no runtime context) or `required(spec)`. Materialized ONCE AT ADMISSION
 * (`admitTemplate` normalizes the authored field; R1/C4), read through the
 * total `resolveRuntimeContextRequirement` view over the already-normalized
 * admitted value — never the first materialization point.
 */
export type RuntimeContextRequirement =
  | { readonly state: "none" }
  | { readonly state: "required"; readonly spec: RuntimeContextSpec };

/**
 * The read-time TOTAL view over the admission-normalized `runtimeContext`
 * field (packet ch12-p3, T1/R1): `"none"` (or absent — the structurally-dead
 * type-level belt, since admission normalizes absent → `"none"`, the G3
 * `activation ?? immediate` culture) → `{state:"none"}`; a spec map →
 * `{state:"required", spec}`. The bare `"required"` string is refused at
 * admission (R2) — reaching it here is structurally-dead integrity drift (the
 * G3 dead-belt precedent). START and `deriveDispatchIntent` READ through this
 * view; they never re-derive the requirement from an absent field.
 */
export function resolveRuntimeContextRequirement(
  field: RuntimeContextSpec | "none" | "required" | undefined,
): RuntimeContextRequirement {
  if (field === undefined || field === "none") {
    return { state: "none" };
  }
  if (field === "required") {
    throw new Error(
      "kernel integrity: an unmaterialized bare 'required' runtimeContext reached the read view — admission should have refused it (R2)",
    );
  }
  return { state: "required", spec: field };
}

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
   * to map + canonical-JSON-safe at admission (A2) on BOTH the
   * direct-construction channel and (ch12-P4, F4) the file source-form
   * walk. ABSENT contributes `{}`.
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
   * D1 (packet ch11-P3a → ch12-p3, T1): the C2/C4 runtime-context declaration
   * at the DOMAIN grain — the window's AUTHORED domain BROADENED at P3
   * (`"required" | undefined` → `RuntimeContextSpec | "none" | "required" |
   * undefined`): a directly-constructed spec map (`required(spec)`), the
   * authored string `"none"` (C2), the RETIRED ch11 `"required"` string (to
   * be REFUSED LOUD at admission, R2), or absent (a context-free workflow, ≡
   * `"none"`). `admitTemplate` MATERIALIZES the requirement ONCE AT ADMISSION
   * (R1/C4 — the activation `?`-belt precedent): it refuses the bare
   * `"required"` string and normalizes `absent → "none"`, so a
   * successfully-admitted template's field ∈ { `"none"`, `RuntimeContextSpec` }
   * — NO absent state downstream. The read-time view is
   * `resolveRuntimeContextRequirement`. A template declaring any process gate
   * without a provisionable requirement FAILS admission (the C5 cross-rule).
   * The `kind`/`provider` STRING-GRAMMAR source-form lanes ship at ch12-P4
   * (F3 — the file-channel spec-map walk).
   */
  readonly runtimeContext?: RuntimeContextSpec | "none" | "required";
  /**
   * G3 (packet ch12-p1b): the C1 activation default at the DOMAIN
   * grain — the per-workflow default mode. OPTIONAL on a raw
   * directly-constructed template; `admitTemplate` MATERIALIZES an
   * absent key to `{mode: "immediate"}` on the admitted value (the
   * `advancesRound` admission-expansion pattern; C1's "materialized
   * once at admission"). Since ch12-P4 the FILE key is authorable (the
   * F2 source-form walk); the authored camelCase faces are the create
   * wire and that walk.
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
