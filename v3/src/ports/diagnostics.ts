import type { ActorId, EventType, InstanceId, OpId, RejectionName } from "../domain/index.js";
import type { EpochMillis } from "./time.js";

/**
 * The named non-authoritative diagnostic channel (plan §7.2, packet
 * ch7-P1; PI-4 / memo Addendum 2 B1). Events are observation ONLY:
 * separate from the transcript, best-effort, never an authority.
 */
export type DiagnosticSource = "ingress" | "kernel" | "runner";

export type DiagnosticKind =
  | "rejected"
  | "stale"
  | "duplicate"
  | "cas_restart"
  | "internal_failure"
  // The runner-plane provisioning-completion kinds (packet ch9-p2, DG2;
  // contract:ch9-runner#C26): every provisioning completion emits ONE of
  // these — `provision_ready` on success, `provision_failed` on any
  // provisioning failure. VALID ONLY with source = "runner" (bidirectional).
  | "provision_ready"
  | "provision_failed"
  // The delivery-errand state-transition kind (packet ch9-p3a, DG1;
  // contract:ch9-runner#C26): EVERY errand state transition (every L1 edge,
  // creation included) emits ONE of these. VALID ONLY with source = "runner".
  | "errand_transition"
  // The spawn-outcome kind (packet ch9-p3b, DG1; contract:ch9-runner#C26):
  // EVERY attempt execution that concludes (incl. the EM3 rejecting path)
  // emits ONE of these. VALID ONLY with source = "runner".
  | "spawn_outcome";

/**
 * The durable delivery-errand lifecycle states (L1; packet ch9-p3a). The
 * value list is the single membership source for the diag read gate AND the
 * runner store's own state validation (they cannot drift). Grows ONLY by a
 * contract successor row.
 */
export const ERRAND_STATES = [
  "pending",
  "claimed",
  "attempting",
  "confirmed",
  "unconfirmed",
  "exhausted",
  "mooted",
] as const;
export type ErrandState = (typeof ERRAND_STATES)[number];

/**
 * The L1 edge TRIGGER labels (packet ch9-p3a, DG1): the closed `errandEdge`
 * domain that keys the per-edge presence iffs (from/to pairs alone collide
 * across triggers). A LIST, not a count — grows only by a contract successor
 * row.
 */
export const ERRAND_EDGES = [
  "create",
  "reconcile-backfill",
  "claim",
  "attempt-start",
  "reclaim",
  "negative-budgeted",
  "negative-respawn",
  "confirm",
  "no-output",
  "other-admit",
  "exhaust",
  "exhaust-at-claim",
  "remint",
  "moot",
  "respawn",
  "evidence-promotion",
  // packet ch9-p3b, H5/DG2 — the attempt-start evidence-first successor edges.
  // BOTH non-birth (errandFrom present) and NON-attempt-scoped (attemptId
  // ABSENT — each fires at its attempt-start HOLD, before any attempt id is
  // minted, the exhaust-at-claim precedent's bucket).
  "evidence-at-claim", // claimed → confirmed (the budgeted hold)
  "evidence-at-respawn", // unconfirmed → confirmed (the re-spawn hold)
] as const;
export type ErrandEdge = (typeof ERRAND_EDGES)[number];

/**
 * The attempt-scoped edges (DG1): `attemptId` is present on the
 * `errand_transition` event IFF its `errandEdge` is one of these. The remint
 * event carries the FRESH attempt's id; the collided id is recoverable from
 * the attempts record.
 */
export const ATTEMPT_SCOPED_ERRAND_EDGES = [
  "attempt-start",
  "negative-budgeted",
  "negative-respawn",
  "confirm",
  "no-output",
  "other-admit",
  "exhaust",
  "remint",
  "respawn",
] as const;

/** The two birth edges (DG1): `errandFrom` is ABSENT on these (no prior state). */
export const ERRAND_BIRTH_EDGES = ["create", "reconcile-backfill"] as const;

/**
 * The `spawn_outcome` token domain (packet ch9-p3b, DG1): the CLOSED token
 * naming the produced attempt-result member at CLASS grain. `name_collision`
 * joined at ch9-P4a (DG3 — the P3b-pre-authorized growth: the tmux channel's
 * host-namespace collision lane, TX3; unreachable on the direct channel).
 * A LIST, not a count — grows only by a contract successor row.
 */
export const SPAWN_OUTCOMES = [
  "submitted",
  "no_output",
  "spawn_infra",
  "nonzero_exit",
  "own_timeout",
  "foreign_kill",
  "name_collision",
] as const;
export type SpawnOutcome = (typeof SPAWN_OUTCOMES)[number];

/**
 * One token per admission-gate block in the ingress parseEnvelope —
 * the token list is a declared claim; every token is test-driven.
 */
export type IngressDetailToken =
  | "not_plain_object"
  | "unknown_key"
  | "invalid_required_string"
  | "invalid_expected_version"
  | "invalid_expected_role"
  | "invalid_event_id"
  | "payload_not_canonicalizable"
  // The operator-intent gate blocks (packet ch12-p1b, I4 — additive
  // growth at BLOCK grain; `not_plain_object`, `unknown_key`, and
  // `invalid_required_string` are REUSED by the intent surface):
  | "unknown_intent"
  | "invalid_template_ref"
  | "invalid_task"
  | "invalid_mode"
  | "invalid_overrides"
  | "invalid_run_overrides"
  // ch14-p2b: the operator-intent wires' own gate block. The two new
  // intents reuse every existing token their blocks need
  // (`invalid_required_string`, `invalid_expected_version`,
  // `payload_not_canonicalizable`); `override` is the ONE form the
  // union could not already name.
  | "invalid_override";

/**
 * The emit-side face: NO timestamp, NO ordinal — the SINK stamps `at`
 * from its own injected TimeSource (the CHK-C-TS-SOURCE precedent;
 * emitters carry no clock). Field presence per lane is CANONICAL in
 * the packet's lane-inventory table: attribution fields come from the
 * typed envelope (`handle`) / valid raw string fields (ingress) /
 * the lifecycle inputs' instanceId+opId (the entry family); `payloadDigest` presence is
 * DIGEST-POINT-based (present on every post-digest lane, absent
 * payload included — never recomputed at emit: the emit path performs
 * NO fallible work); `error.message` is UNTRUSTED free text confined
 * to the diag channel's store and local read surfaces.
 */
export interface DiagnosticEventBody {
  readonly source: DiagnosticSource;
  readonly kind: DiagnosticKind;
  readonly instanceId?: InstanceId;
  readonly opId?: OpId;
  readonly actorId?: ActorId;
  readonly type?: EventType;
  /** Present iff kind = "rejected" — the exact rejection name. */
  readonly reason?: RejectionName;
  /** Present iff source = "ingress" — the failed admission gate. */
  readonly detail?: IngressDetailToken;
  /**
   * Present iff kind ∈ {provision_ready, provision_failed} (packet ch9-p2,
   * DG2; RE-SCOPED at ch9-p3a, DG3/flag F5): the provisioning completion's
   * correlation id. The ch9-p2 source-grain iff ("iff source = runner") is
   * re-examined here as its own clause mandated — the `errand_transition`
   * kind is `source: "runner"` yet carries NO requestId, so the iff is now
   * KIND-grained (unchanged for the two provisioning kinds).
   */
  readonly requestId?: string;
  /**
   * Present iff kind = "provision_failed" (packet ch9-p2, DG2): the RAW
   * reason token AS THE PROVIDER REPORTED IT — a plain string,
   * UNTRUSTED-CONFINED exactly like `error.message`, NEVER the classified
   * enum. The event precedes the kernel's transport gate, so a
   * hostile/unknown token is carried VERBATIM (the kernel's gate throw
   * proceeds unchanged); membership is deliberately NOT read-gated.
   */
  readonly providerReason?: string;
  /**
   * Present iff the report's `detail` value is a plain string (packet
   * ch9-p2, DG2): PB3's bounded stderr/error tail — only on
   * "provision_failed", UNTRUSTED-CONFINED to the diag store + local read
   * surfaces. A non-string hostile detail is OMITTED at emit and the event
   * still fires.
   */
  readonly providerDetail?: string;
  /**
   * Present iff kind ∈ {"errand_transition", "spawn_outcome"} (packet ch9-p3a
   * DG1 + ch9-p3b DG2 — RE-SCOPED, split out of the shared errand-field iff):
   * the C13 errand key `<instance_id>@v<expected_version>`. Required on BOTH
   * kinds.
   */
  readonly contextPacketId?: string;
  /**
   * Present iff kind = "errand_transition" (DG1): the L1 TRIGGER label — the
   * wire discriminator keying the per-edge iffs (from/to pairs alone collide).
   */
  readonly errandEdge?: ErrandEdge;
  /** Present iff kind = "errand_transition" (DG1): the resulting state. */
  readonly errandTo?: ErrandState;
  /**
   * Present iff kind = "errand_transition" AND a prior state existed — absent
   * on the two birth edges (create, reconcile-backfill).
   */
  readonly errandFrom?: ErrandState;
  /**
   * Present on `spawn_outcome` ALWAYS (packet ch9-p3b, DG1), and on
   * `errand_transition` iff `errandEdge` is attempt-scoped
   * (ATTEMPT_SCOPED_ERRAND_EDGES — the remint event carries the FRESH id). The
   * two H5 successor edges (`evidence-at-claim`/`evidence-at-respawn`) are
   * NON-attempt-scoped, so `attemptId` is ABSENT on them.
   */
  readonly attemptId?: string;
  /**
   * Present iff kind = "spawn_outcome" (packet ch9-p3b, DG1): the CLOSED token
   * naming the produced attempt-result member at class grain (SPAWN_OUTCOMES).
   */
  readonly spawnOutcome?: SpawnOutcome;
  /**
   * Present ONLY on kind = "spawn_outcome", OPTIONAL (packet ch9-p3b, DG1): an
   * UNTRUSTED diagnostic free-text tail (a captured-stderr tail, bounded by the
   * PB3 2000-code-unit cap precedent). A DISTINCT kind-scoped field per the
   * `providerDetail` precedent — NEVER the ingress-scoped closed-token
   * `detail`; confined to the diagnostic surface, never parsed, never matched.
   */
  readonly spawnDetail?: string;
  /** Present iff kind = "stale" — the envelope's expected version. */
  readonly expectedVersion?: number;
  /** Present iff kind = "stale" — the outcome's current version. */
  readonly currentVersion?: number;
  /** The attempt-computed digest, THREADED — never recomputed here. */
  readonly payloadDigest?: string;
  /** Present iff kind = "internal_failure". */
  readonly error?: { readonly name: string; readonly message: string };
}

/** The read-side face — `at` and `ordinal` are stamped by the P2 store. */
export type DiagnosticEvent = DiagnosticEventBody & {
  readonly at: EpochMillis;
  readonly ordinal: number;
};

/**
 * The fail-open contract lives ON THIS PORT (plan §7.2): emit never
 * THROWS; implementations swallow their OWN failures; an emit never
 * changes an Outcome and never touches the main commit path.
 * Non-blocking is NOT claimed (the SQLite path is a sync driver).
 * Call sites call it BARE — a defensive wrapper would blur the owner
 * (REV-DIAG-FAILOPEN reviews custom implementations).
 */
export interface DiagnosticsSink {
  emit(body: DiagnosticEventBody): void;
}

/**
 * The enumerated unavailability reason (packet ch7-P2, plan §7.4). This
 * is a DECLARED claim — every token is test-driven. The token (never the
 * raw underlying error text) is what P3's bundle serializes as
 * `unavailable(reason)`. `open_failed` / `read_failed` are I/O-shaped;
 * `refused_marker` is the fail-open transpose of the main store's
 * fail-closed marker refusal (ADR-003 → ADR-010).
 */
export type DiagUnavailableReason = "open_failed" | "refused_marker" | "read_failed";

/**
 * The read-side face of the diag channel (packet ch7-P2, store impl in
 * `diag/`). FAIL-LOUD, the transpose of the committed floor's null/`[]`
 * duality (§6.2): an unavailable or corrupt store is a typed error
 * carrying a `DiagUnavailableReason` — NEVER `[]` — while known-empty is
 * `[]`. There is NO null lane: the diag store has no instance-existence
 * authority (unknown instance ≡ known-empty ≡ `[]`). Rows are
 * SHAPE-VALIDATED on read (the emit allowlist reused): a stored row that
 * is not a P1-declared projection fails the WHOLE read, never leaks out
 * the typed surface. Promise-based (StorePort parity) while `emit` is
 * sync void — a deliberate asymmetry.
 */
export interface DiagnosticsReader {
  /** The instance's ATTRIBUTED rows, ordinal-ascending, `ordinal > afterOrdinal`. */
  getDiagnostics(
    instanceId: InstanceId,
    afterOrdinal: number,
  ): Promise<readonly DiagnosticEvent[]>;
  /** ALL rows (unattributed included), same cursor semantics. */
  getGlobalDiagnostics(afterOrdinal: number): Promise<readonly DiagnosticEvent[]>;
}
