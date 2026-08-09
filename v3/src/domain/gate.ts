import type { BlockId, EventType, RoleName, StepId } from "./ids.js";

/**
 * The gate domain values (packet ch11-P2a, D2–D5; ledger §4 l2). The
 * authored pipeline shapes plus the evaluator's read projection and
 * decision — the domain mirror of the Block A gate system. The
 * registration/catalog EXTENSION contract lives in `ports/gate.ts`
 * (injected); these are the pure values the domain and evaluators
 * exchange.
 */

/**
 * D2: a single gate binding at a (step, event-type) point. `where`
 * lives in the containing keys (the step id + the event type). The
 * ADMITTED binding carries the EFFECTIVE config in this same `config`
 * field — its single config surface (A5); the raw authored form is
 * admission's input and never travels downstream of it.
 */
export interface GateBinding {
  readonly uses: string;
  readonly config?: unknown;
  /**
   * ch13v2-C6/C13 (packet ch13-p1a): the binding's context-block ref
   * list. Unlike the two config positions this key is AUTHORED (C6) and
   * channel-both — admission carries it onto the admitted value through
   * the effective-config rebuild rather than producing it from another
   * position, and materializes the empty list where nothing was
   * authored. OPTIONAL on the shared raw type per C13's TYPE GRAIN,
   * present on every admitted binding.
   */
  readonly contextBlockRefs?: readonly BlockId[];
}

/**
 * D3: the ordered pipeline at one (step, event) point. Authored order
 * IS pipeline order (P2b's rung consumes it first-block-wins).
 * Nonemptiness is an admission lane (A4/C3), never a type claim.
 */
export type GatePipeline = readonly GateBinding[];

/**
 * D4: the ledger's gate decision value (camelCase realization). `route`
 * is NOT a verdict (the routing slice's Absent); the snake_case WIRE
 * form is P3's C25 surface.
 */
export interface GateDecision {
  readonly verdict: "allow" | "warn" | "block";
  readonly reason?: string;
  readonly message?: string;
  readonly evidenceRefs?: readonly string[];
}

/**
 * O2 (packet ch11-P2b): C27's retained decision list as a domain value
 * (camelCase realization, the D4 precedent). A committed transition
 * carries its ordered allow/warn verdicts; `uses` names the producing
 * binding. `block` is UNREPRESENTABLE in the verdict union — a block
 * never commits, so it never becomes a retained value (type-level).
 */
export interface RetainedGateDecision {
  readonly uses: string;
  readonly verdict: "allow" | "warn";
  readonly reason?: string;
  readonly message?: string;
  readonly evidenceRefs?: readonly string[];
}

/**
 * D5: one committed-transition history entry the projection carries.
 */
export interface GateProjectionEntry {
  readonly stepId: StepId;
  readonly eventType: EventType;
  readonly role: RoleName;
}

/**
 * D5: the `evaluate` second input — C24's Block A field list. The
 * DERIVATION (`derive_policy_view`, the kernel read) is P2b's unit.
 */
export interface GateProjection {
  readonly round: number;
  readonly currentStep: StepId;
  readonly eventType: EventType;
  readonly history: readonly GateProjectionEntry[];
}

/**
 * The materialized effective `external.process` config (packet ch11-P3a's
 * V-matrix; the type HOME MOVED here at ch11-P3b so the kernel branch and the
 * `gates/process.ts` validator share ONE shape — never two homes). Admission
 * produces it ONCE (`validateAndNormalizeConfig`); every downstream reader —
 * including the P3b process wire — reads only this form (A5). Field presence
 * per output mode: `exitCode` mode carries `onExit` AND a complete `reason`
 * (both buckets, authored-or-default — V1); `gateDecisionJson` mode omits
 * `onExit`, and `reason` rides IFF authored (carried verbatim). The kernel
 * reads it through a typed cast, never re-validating (C20/C22 by-construction).
 */
export interface EffectiveProcessConfig {
  readonly command: string;
  readonly timeoutMs: number;
  readonly output: { readonly mode: "exitCode" | "gateDecisionJson" };
  readonly onExit?: {
    readonly zero: "allow" | "warn" | "block";
    readonly nonzero: "allow" | "warn" | "block";
  };
  readonly onRunnerError: "blockTransition";
  readonly onTimeout: "blockTransition";
  readonly reason?: { readonly zero?: string; readonly nonzero?: string };
}
