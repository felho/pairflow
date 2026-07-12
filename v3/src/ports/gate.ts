import type { GateDecision, GateProjection } from "../domain/index.js";

/**
 * The gate EXTENSION contract (packet ch11-P2a, R1–R5; ledger §2 l2).
 * The ch-3 placeholder spec/runner shapes are RETIRED (R5) — this port
 * now carries the ledger's registration/catalog descriptor and nothing
 * else. The registry maps a gate's `uses` id to its registration;
 * composition is STATIC (dynamic loading is Absent), injected through
 * the `GateCatalog`.
 */

/**
 * R4: the config-relative finding a registration emits. `path` is
 * relative to the gate's config object (`""` = the config itself, a
 * dotted key otherwise); admission PREFIXES it with the binding's C7
 * address (`steps.<stepId>.gates.<eventType>[<i>].config…`). The
 * message is unconstrained diagnostic text.
 */
export interface GateConfigFinding {
  readonly path: string;
  readonly message: string;
}

/**
 * R4: the two-arm result of config validation + normalization — the
 * EFFECTIVE config XOR a NONEMPTY finding set (the ledger's
 * `effective | issues`). Defaults materialize on the `ok` arm, once.
 * The failure arm is statically nonempty (arm-gate-2 finding 1): an
 * empty-findings failure would let admission succeed with no effective
 * config — the tuple type forbids it, and admission carries a runtime
 * belt for a cast-forged registration.
 */
export type GateConfigResult =
  | { readonly ok: true; readonly effective: unknown }
  | { readonly ok: false; readonly findings: readonly [GateConfigFinding, ...GateConfigFinding[]] };

/**
 * R1: the shared descriptor axes. `execution` is realized with its
 * domain pinned to the singleton `"inline"` — `"deferred"` is the
 * model's named Absent (a later lifecycle slice), left UNREPRESENTABLE
 * (the `inline-declarative-packaged-only-in-l2-core` invariant's
 * type/schema disposition). `requiresRuntimeContext` is read by
 * admission (its cross-rule branch is P3).
 */
interface GateRegistrationBase {
  readonly execution: "inline";
  readonly requiresRuntimeContext: boolean;
  validateAndNormalizeConfig(raw: unknown): GateConfigResult;
}

/**
 * R2: the inline variant (`declarative` | `packaged`) additionally
 * carries `evaluate`.
 */
export interface InlineGateRegistration extends GateRegistrationBase {
  readonly implementation: "declarative" | "packaged";
  evaluate(effectiveConfig: unknown, projection: GateProjection): GateDecision;
}

/**
 * R2: a process-implementation registration carries NO `evaluate` — its
 * execution path is `run_process_gate` (P3). The type-discriminated
 * union makes the process arm unable to hold an evaluator.
 */
export interface ProcessGateRegistration extends GateRegistrationBase {
  readonly implementation: "process";
}

export type GateRegistration = InlineGateRegistration | ProcessGateRegistration;

/**
 * R3: the injected catalog. `resolve` maps a binding's `uses` VALUE to
 * its registration; `null` = unknown, which ADMISSION maps to the
 * `gate_evaluator_unavailable` definition issue (A3). No mutation API
 * (note 5): the registry is composition, not a lookup table.
 */
export interface GateCatalog {
  resolve(uses: string): GateRegistration | null;
}
