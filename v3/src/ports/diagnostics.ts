import type { ActorId, EventType, InstanceId, OpId, RejectionName } from "../domain/index.js";
import type { EpochMillis } from "./time.js";

/**
 * The named non-authoritative diagnostic channel (plan §7.2, packet
 * ch7-P1; PI-4 / memo Addendum 2 B1). Events are observation ONLY:
 * separate from the transcript, best-effort, never an authority.
 */
export type DiagnosticSource = "ingress" | "kernel";

export type DiagnosticKind =
  | "rejected"
  | "stale"
  | "duplicate"
  | "cas_restart"
  | "internal_failure";

/**
 * One token per admission-gate block in the ingress parseEnvelope —
 * the token list is a declared claim; every token is test-driven.
 */
export type IngressDetailToken =
  | "not_plain_object"
  | "unknown_key"
  | "invalid_required_string"
  | "invalid_expected_version"
  | "invalid_event_id"
  | "payload_not_canonicalizable";

/**
 * The emit-side face: NO timestamp, NO ordinal — the SINK stamps `at`
 * from its own injected TimeSource (the CHK-C-TS-SOURCE precedent;
 * emitters carry no clock). Field presence per lane is CANONICAL in
 * the packet's lane-inventory table: attribution fields come from the
 * typed envelope (`handle`) / valid raw string fields (ingress) /
 * StartInstanceInput (`startInstance`); `payloadDigest` presence is
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
