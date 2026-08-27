import type {
  LifecycleFactKind,
  RoleName,
  TranscriptEntry,
  WorkflowInstance,
} from "../domain/index.js";

/**
 * The consolidated ADMISSION ladder (l1-pseudocode/admit_loaded,
 * packet ch11-P1): idempotency → lifecycle/state → CORRELATE →
 * version-presence → staleness → authority-presence → authority-match.
 * Rung ORDER is contract — every adjacent-rung combination answers with
 * the earlier rung's outcome, driven by combination lanes.
 *
 * IT IS ONE LADDER, PARAMETERIZED (packet ch14-p2b, Q3), never a new
 * one per entry path: `expect.*` parameterizes the rungs per path and
 * an ABSENT expectation SKIPS its rung. Three paths ride it — the actor
 * envelope through `HANDLE`, and the two operator intents through
 * `admitInput`, the load-first companion born at L3.
 *
 * Realized deltas vs the unit text, all packet-declared:
 * - the idempotency rung is DIGEST-AWARE on the actor path (the ch5-P4
 *   realized extension): a committed row under the same op_id with the
 *   same digest is a duplicate, a different digest is a VISIBLE
 *   collision — and it wins over every later rung. The COMPARE MODE is
 *   the caller's (Q15): the operator paths take the KIND compare;
 * - THE CORRELATE RUNG NOW HAS ITS PARAMETER. It arrived with the two
 *   operator intents (ch14-p2b), not with kernel events — this comment
 *   said the opposite until this packet, and a comment describing an
 *   ABSENT rung is how the next reader concludes it is still absent.
 *   Its test-side twin, the A13 lane's TITLE, is corrected in the same
 *   edit for the same reason;
 * - the AUTHORITY rung is SKIPPABLE BY GROUP and carries per-path
 *   names. An absent GROUP is a skip (the resume path); an absent CLAIM
 *   inside a present group is still a rejection.
 *
 * THE LADDER STAYS SYNCHRONOUS. A rung read is an INFALLIBLE read over
 * committed state; a build reaching for `await` inside a rung has left
 * the shape this ladder decided, and a rung-local read that grows a
 * reject or assert branch is a NEW FINDING, not a silent property.
 *
 * The ladder is a PURE pre-check fast path — the commit transaction
 * stays the correctness mechanism (REV-A1-TXN).
 */
export type AdmitResult<R extends AdmitRejectReason = AdmitRejectReason> =
  | { readonly kind: "accepted" }
  | { readonly kind: "duplicate" }
  | { readonly kind: "stale"; readonly currentVersion: number }
  | { readonly kind: "rejected"; readonly reason: R | AdmitLadderOwnReason };

/**
 * The two names the LADDER ITSELF owns rather than receiving from a
 * caller's expectation — the idempotency rung's collision and the
 * staleness rung's entry guard. Every other name rides its expectation
 * ("a rung's reject name rides the expectation — the ladder knows no
 * vocabulary"), which is why the result is PARAMETERIZED by the names
 * the caller actually supplied: each entry path's outcome union then
 * carries exactly its own rungs' names and no others, and a name a path
 * cannot produce is a COMPILE error at that path rather than a lane
 * nobody wrote.
 */
export type AdmitLadderOwnReason = "op_id_collision" | "missing_version";

/**
 * The ladder's reject vocabulary. CLOSED at five names until ch14-p2b,
 * which OPENS it by five more — the two operator paths' state,
 * correlation and authority names (C15, C18, C19). `unknown_instance`
 * is deliberately NOT here: the load is not a rung, so its answer is
 * carried by `admitInput`'s own wider result rather than by widening
 * the union every path shares (Q3 leaves that shape to the build; this
 * is the choice taken).
 */
export type AdmitRejectReason =
  | "op_id_collision"
  | "not_active"
  | "missing_version"
  | "missing_role"
  | "role_not_authorized"
  | "not_awaiting_decision"
  | "not_waiting"
  | "decision_request_mismatch"
  | "resume_event_mismatch"
  | "operator_not_authorized";

/**
 * Q15 (packet ch14-p2b): the idempotency compare's KIND domain — the
 * transcript discriminant MINUS the one value that must never reach
 * this compare.
 *
 * IT KEEPS THE AUTO-EXTENSION PROPERTY: a SUBTRACTION still grows with
 * the union, so a future entry class needs no edit here and there is no
 * hand-maintained list anyone can forget to extend. AND IT MAKES THE
 * DANGEROUS VALUE UNREPRESENTABLE rather than merely undriven —
 * `"transition"` as a compare kind would bypass the digest half the
 * actor path's duplicate detection depends on, and the compiler now
 * refuses it at every call site. It also states C15's own letter as a
 * TYPE: the digest compare stays transition-only, expressed where it
 * cannot drift. The prior art is `domain/outcome.ts`'s
 * `Exclude<RejectionName, "gate_blocked">`.
 *
 * IF A FUTURE ROW CLASS EVER NEEDS DIGEST MODE that is a CONTRACT
 * change and this type moves with its ratification — not a build's to
 * widen.
 */
export type AdmitCompareKind = Exclude<TranscriptEntry["entryKind"], "transition">;

/**
 * The idempotency rung's expectation — the row found under
 * (instanceId, opId) plus the caller's COMPARE MODE. The mode is the
 * CALLER's, never inferred from the row found: the actor path keeps the
 * digest compare, the operator paths take the kind compare (C15's
 * "the digest compare stays transition-only").
 */
export interface AdmitIdempotencyExpect {
  readonly existing: {
    readonly payloadDigest: string | null;
    readonly entryKind: TranscriptEntry["entryKind"];
  } | null;
  readonly compare:
    | { readonly mode: "digest"; readonly payloadDigest: string }
    | { readonly mode: "kind"; readonly kind: AdmitCompareKind };
}

/**
 * A rung whose predicate is CALLER-SUPPLIED and whose reject NAME rides
 * the expectation — "the ladder knows no vocabulary" (the l0d header).
 * The predicate is a FUNCTION rather than a pre-computed boolean
 * because C9 fixes that expectations are evaluated LAZILY, each at its
 * own rung, in rung order: a rung later in the order must not have had
 * its read performed by an earlier one.
 *
 * The reads are the INFALLIBLE class C9 names — the loaded instance,
 * its pinned template, step positions. A predicate that needs a reject
 * or assert branch of its own is a NEW FINDING and a STOP, never a
 * silent property.
 */
export interface AdmitPredicateExpect<R extends AdmitRejectReason = AdmitRejectReason> {
  readonly holds: (instance: WorkflowInstance) => boolean;
  readonly reject: R;
}

/**
 * The AUTHORITY rung's expectation — an optional GROUP, not HANDLE's
 * former flat pair, and the difference decides a rejection.
 *
 * **THE TWO ABSENCES ARE DIFFERENT STATES.** An absent GROUP is a SKIP
 * (the resume path's one inhabitant, C18's deliberate absence — the
 * selection there is kernel-classified). An absent CLAIM inside a
 * PRESENT group is a REJECTION under the group's own `missing` name.
 * HANDLE passes the group ALWAYS, with `claim: envelope.expectedRole`,
 * so an absent expectedRole keeps meaning `missing_role` exactly as it
 * did. A build that collapsed the two absences would hand an actor with
 * no role claim an `accepted`.
 *
 * `granted` is a value ALREADY RESOLVED before the ladder is called —
 * never a port and never an `await`, which is what keeps the shared
 * ladder SYNCHRONOUS (Q3).
 */
export interface AdmitAuthorityExpect<R extends AdmitRejectReason = AdmitRejectReason> {
  readonly claim: string | undefined;
  readonly granted: RoleName | undefined;
  readonly missing: R;
  readonly mismatch: R;
}

/**
 * The ladder's PARAMETERIZATION (the l0d `expect.*` form: an absent
 * expectation skips its rung). Rung order is CONTRACT and unchanged:
 * idempotency → state → correlate → version → authority.
 */
export interface AdmitExpect<R extends AdmitRejectReason = AdmitRejectReason> {
  readonly idempotency: AdmitIdempotencyExpect;
  /** ALWAYS present — every entry path has a state expectation. */
  readonly state: AdmitPredicateExpect<R>;
  /**
   * ch14-p2b: the correlate rung's FIRST ARRIVAL as a ladder
   * expectation. It lands BETWEEN state and version, the position C15
   * and C18 both fix and the model already declares. Absent on the
   * actor path, which skips the rung.
   */
  readonly correlate?: AdmitPredicateExpect<R>;
  /** Version rungs: absence = the entry guard's missing_version. */
  readonly expectedVersion: number | undefined;
  /** Absent GROUP = SKIP (the resume path). See the class comment. */
  readonly authority?: AdmitAuthorityExpect<R>;
}

export function admitLoaded<R extends AdmitRejectReason>(
  instance: WorkflowInstance,
  expect: AdmitExpect<R>,
): AdmitResult<R> {
  // Idempotency rung, FIRST: wins over state and everything later. The
  // COMPARE MODE is the caller's (Q15) — digest on the actor path,
  // KIND on the operator paths. A FACT or operator row under an actor
  // envelope's op_id is a collision: the digest compare is
  // transition-only and unanswerable against a digest-less row.
  const { existing, compare } = expect.idempotency;
  if (existing !== null) {
    const isReplay =
      compare.mode === "digest"
        ? existing.entryKind === "transition" && existing.payloadDigest === compare.payloadDigest
        : existing.entryKind === compare.kind;
    return isReplay ? { kind: "duplicate" } : { kind: "rejected", reason: "op_id_collision" };
  }
  // State rung — the caller's predicate under the caller's name. The
  // actor path passes ACTIVE/`not_active`; the submit path
  // WAITING(human_decision)/`not_awaiting_decision`; the resume path
  // WAITING/`not_waiting`.
  if (!expect.state.holds(instance)) {
    return { kind: "rejected", reason: expect.state.reject };
  }
  // Correlate rung — BETWEEN state and version (C15/C18 both fix the
  // position). Absent on the actor path, which skips it.
  if (expect.correlate !== undefined && !expect.correlate.holds(instance)) {
    return { kind: "rejected", reason: expect.correlate.reject };
  }
  // Version-presence is the staleness rung's ENTRY GUARD, not a
  // separate rung. On BOTH operator paths too (the F-W4-2
  // canonicalization): an ABSENT expectedVersion is `missing_version`
  // at the RUNG, never an ingress refusal.
  if (expect.expectedVersion === undefined) {
    return { kind: "rejected", reason: "missing_version" };
  }
  if (expect.expectedVersion !== instance.version) {
    return { kind: "stale", currentVersion: instance.version };
  }
  // Authority rung — SKIPPABLE by GROUP (C18's absent rung on the
  // resume path), presence then match under the group's OWN names. An
  // absent CLAIM inside a present group is still a rejection.
  const authority = expect.authority;
  if (authority !== undefined) {
    if (authority.claim === undefined) {
      return { kind: "rejected", reason: authority.missing };
    }
    if (authority.claim !== authority.granted) {
      return { kind: "rejected", reason: authority.mismatch };
    }
  }
  return { kind: "accepted" };
}

/**
 * Q3's TYPE-LEVEL ARITY PIN. `Function.prototype.length` stops at the
 * first parameter carrying a DEFAULT VALUE or a rest — NOT at the first
 * optional one — so a bare `admitLoaded(instance, expect, input?)` emits
 * `.length === 3` and the runtime lane reds, while
 * `admitLoaded(instance, expect, input = undefined)` keeps
 * `.length === 2` and PASSES. A `const` of the two-parameter FUNCTION
 * type is blind to BOTH, since assignability accepts a source whose
 * extra parameters are optional. What REDS on both is the arity read as
 * a TYPE: either third parameter widens this to `2 | 3`.
 */
export type AdmitLoadedArity = Parameters<typeof admitLoaded>["length"];
const admitLoadedArityIsTwo: AdmitLoadedArity extends 2 ? true : false = true;
void admitLoadedArityIsTwo;

/**
 * The LIFECYCLE parameterization of the same admission protocol
 * (packet ch12-p1b, A1 — the l0d `expect.*` form: an absent expectation
 * skips its rung). Rung order preserved: idempotency FIRST (kind-aware,
 * A2 — a hit of the intent's OWN fact kind is a replay, any other kind
 * a collision), then the caller-supplied STATE predicate. The state
 * rung's rejection stays UNNAMED (bare-REQUIRE semantics, A4) — the
 * `state_violation` result is an internal token the HANDLER converts
 * into its own fail-loud guard throw, never a public outcome. No
 * version or authority rung exists on any lifecycle path (the intents
 * carry no expectedVersion/expectedRole).
 */
export interface LifecycleAdmitExpect {
  /** null = no idempotency rung (FAIL — a kernel event carries no op_id). */
  readonly op: {
    readonly existing: {
      readonly payloadDigest: string | null;
      readonly entryKind: TranscriptEntry["entryKind"];
    } | null;
    readonly factKind: LifecycleFactKind;
  } | null;
  /** The op's state expectation, evaluated by the caller over the loaded instance. */
  readonly stateHolds: boolean;
}

export type LifecycleAdmitResult =
  | { readonly kind: "accepted" }
  | { readonly kind: "duplicate" }
  | { readonly kind: "rejected"; readonly reason: "op_id_collision" }
  | { readonly kind: "state_violation" };

export function admitLifecycle(expect: LifecycleAdmitExpect): LifecycleAdmitResult {
  if (expect.op !== null && expect.op.existing !== null) {
    return expect.op.existing.entryKind === expect.op.factKind
      ? { kind: "duplicate" }
      : { kind: "rejected", reason: "op_id_collision" };
  }
  if (!expect.stateHolds) {
    return { kind: "state_violation" };
  }
  return { kind: "accepted" };
}
