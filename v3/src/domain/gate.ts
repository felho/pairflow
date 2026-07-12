import type { EventType, RoleName, StepId } from "./ids.js";

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
