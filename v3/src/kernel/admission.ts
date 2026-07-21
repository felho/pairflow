import type { RoleName, WorkflowInstance } from "../domain/index.js";

/**
 * The consolidated ADMISSION ladder (l1-pseudocode/admit_loaded,
 * packet ch11-P1): idempotency → lifecycle/state → version-presence →
 * staleness → authority-presence → authority-match. Rung ORDER is
 * contract — every adjacent-rung combination answers with the earlier
 * rung's outcome (packet matrix A, driven by combination lanes).
 *
 * Realized deltas vs the unit text, both packet-declared:
 * - the idempotency rung is DIGEST-AWARE (the ch5-P4 realized
 *   extension): a committed row under the same op_id with the same
 *   digest is a duplicate, a different digest is a VISIBLE collision
 *   — and it wins over every later rung;
 * - the correlate rung's PARAMETER is omitted entirely (packet A13):
 *   no realized caller can pass a correlation expectation — carrying
 *   it would be undrivable dead code; the rung arrives with kernel
 *   events (L0e+).
 *
 * The ladder is a PURE pre-check fast path — the commit transaction
 * stays the correctness mechanism (REV-A1-TXN).
 */
export type AdmitResult =
  | { readonly kind: "accepted" }
  | { readonly kind: "duplicate" }
  | { readonly kind: "stale"; readonly currentVersion: number }
  | { readonly kind: "rejected"; readonly reason: "op_id_collision" | "not_active" | "missing_version" | "missing_role" | "role_not_authorized" };

export interface AdmitExpect {
  /** Idempotency rung input: the committed row under (instanceId, opId), or null. */
  readonly existingOp: { readonly payloadDigest: string } | null;
  /** The attempt's computed digest the collision compare reads (threaded, never recomputed). */
  readonly payloadDigest: string;
  /** Version rungs: the envelope's expectedVersion (absence = the entry guard's missing_version). */
  readonly expectedVersion: number | undefined;
  /** Authority claim: the envelope's expectedRole (absence = missing_role). */
  readonly expectedRole: string | undefined;
  /**
   * Authority grant: the position's active role — read only at the
   * authority rung. `undefined` only for a terminal current step,
   * which the state rung rejects BEFORE the authority rung runs
   * (ACTIVE ⇒ currentStep ∈ steps by construction), so the rung
   * never compares against undefined.
   */
  readonly grantedRole: RoleName | undefined;
}

export function admitLoaded(instance: WorkflowInstance, expect: AdmitExpect): AdmitResult {
  // Idempotency rung — digest-aware, FIRST: wins over state and everything later.
  if (expect.existingOp !== null) {
    return expect.existingOp.payloadDigest === expect.payloadDigest
      ? { kind: "duplicate" }
      : { kind: "rejected", reason: "op_id_collision" };
  }
  // Lifecycle/state rung — the l0d basis (packet ch12-p1a, E5): an
  // actor emits only into actor-routable ACTIVE execution
  // (`kernel_status = ACTIVE → Rejected(not_active)`, the l0d
  // admit_loaded expect). Rung ORDER is byte-identical to ch11-P1;
  // at P1a the reachable states are exactly {ACTIVE, TERMINAL(done)},
  // so the rung's behavior is exactly the ch11 `status !== "RUNNING"`
  // behavior under the unchanged ch11-P1 rejection name.
  if (instance.kernelStatus !== "ACTIVE") {
    return { kind: "rejected", reason: "not_active" };
  }
  // Version-presence is the staleness rung's ENTRY GUARD, not a separate rung.
  if (expect.expectedVersion === undefined) {
    return { kind: "rejected", reason: "missing_version" };
  }
  if (expect.expectedVersion !== instance.version) {
    return { kind: "stale", currentVersion: instance.version };
  }
  // Authority rung (arrives here, L1) — presence then match, the
  // same two-step shape as staleness.
  if (expect.expectedRole === undefined) {
    return { kind: "rejected", reason: "missing_role" };
  }
  if (expect.expectedRole !== expect.grantedRole) {
    return { kind: "rejected", reason: "role_not_authorized" };
  }
  return { kind: "accepted" };
}
